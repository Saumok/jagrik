import express from "express";
import cors from "cors";
import multer from "multer";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { env, flags, startupBanner } from "./env.js";
import { runReport } from "./orchestrator.js";
import { getPdf, getPhoto, putPhoto } from "./lib/store.js";
import { listIssues, getIssue, updateIssue, seedIfEmpty } from "./lib/issuesStore.js";
import { verifyFix, type Media } from "./lib/gemini.js";
import { computeDashboard } from "./lib/dashboard.js";
import { reverseGeocode } from "./lib/geocode.js";
import {
  listPosts,
  getPost,
  createPost,
  toggleUpvote,
  votePoll,
  listComments,
  addComment,
  seedCommunityIfEmpty,
} from "./lib/community.js";
import { randomUUID } from "node:crypto";
import type { ReportRequest, RunEvent } from "./types.js";

const app = express();
app.use(cors());
app.use(express.json());

// Memory storage; cap upload size to protect free tiers (Docs/07 §2).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, gemini: flags.geminiEnabled, email: flags.emailEnabled, model: env.geminiModel });
});

// Reverse-geocode device coords → real area name (for the intake location chip).
app.get("/api/geocode", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ error: "lat/lng required" });
  res.json({ area: (await reverseGeocode(lat, lng)) ?? null });
});

// The orchestrator endpoint. Streams NDJSON: one JSON object per line, flushed
// as each agent step completes — this is what the war-room renders live.
app.post(
  "/api/report",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "audio", maxCount: 1 },
  ]),
  async (req, res) => {
    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");

    const emit = (e: RunEvent) => res.write(JSON.stringify(e) + "\n");

    try {
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const imageFile = files?.image?.[0];
      const audioFile = files?.audio?.[0];
      const media: { image?: Media; audio?: Media } = {};
      if (imageFile) media.image = { buf: imageFile.buffer, mime: imageFile.mimetype };
      if (audioFile) media.audio = { buf: audioFile.buffer, mime: audioFile.mimetype };

      const b = req.body ?? {};
      const reqData: ReportRequest = {
        source: (b.source as ReportRequest["source"]) || (audioFile ? "voice" : "photo"),
        note: b.note || undefined,
        transcript: b.transcript || undefined,
        lat: b.lat ? Number(b.lat) : undefined,
        lng: b.lng ? Number(b.lng) : undefined,
        area: b.area || undefined,
        ward: b.ward ? Number(b.ward) : undefined,
      };

      await runReport(reqData, media, emit);
      emit({ type: "done" });
    } catch (err) {
      console.error("[report] pipeline error:", err);
      emit({ type: "error", message: (err as Error).message || "Pipeline failed" });
    } finally {
      res.end();
    }
  },
);

// Serve a generated complaint PDF.
app.get("/api/pdf/:id", (req, res) => {
  const pdf = getPdf(req.params.id);
  if (!pdf) return res.status(404).json({ error: "not found" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${pdf.filename}"`);
  res.send(pdf.content);
});

// Serve an uploaded issue photo.
app.get("/api/photo/:id", (req, res) => {
  const photo = getPhoto(req.params.id);
  if (!photo) return res.status(404).json({ error: "not found" });
  res.setHeader("Content-Type", photo.mime);
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(photo.content);
});

// Issues for the map list + detail page.
app.get("/api/issues", async (_req, res) => {
  res.json({ issues: await listIssues() });
});
app.get("/api/issues/:id", async (req, res) => {
  const issue = await getIssue(req.params.id);
  if (!issue) return res.status(404).json({ error: "not found" });
  res.json({ issue });
});

// ---- Community Hub ----
app.get("/api/community", async (req, res) => {
  res.json({ posts: await listPosts(typeof req.query.type === "string" ? req.query.type : undefined) });
});
app.post("/api/community", async (req, res) => {
  const b = req.body ?? {};
  if (!b.authorId || !b.body || !b.type) return res.status(400).json({ error: "authorId, type, body required" });
  const post = await createPost({
    authorId: b.authorId,
    authorHandle: b.authorHandle || "Anonymous citizen",
    type: b.type,
    title: b.title,
    body: b.body,
    area: b.area,
    pollOptions: Array.isArray(b.pollOptions) ? b.pollOptions : undefined,
  });
  res.json({ post });
});
app.post("/api/community/:id/upvote", async (req, res) => {
  const post = await toggleUpvote(req.params.id, req.body?.userId || "anon");
  if (!post) return res.status(404).json({ error: "not found" });
  res.json({ post });
});
app.post("/api/community/:id/poll", async (req, res) => {
  const post = await votePoll(req.params.id, req.body?.userId || "anon", Number(req.body?.optionIndex));
  if (!post) return res.status(404).json({ error: "not found" });
  res.json({ post });
});
app.get("/api/community/:id/comments", async (req, res) => {
  if (!(await getPost(req.params.id))) return res.status(404).json({ error: "not found" });
  res.json({ comments: await listComments(req.params.id) });
});
app.post("/api/community/:id/comments", async (req, res) => {
  const b = req.body ?? {};
  if (!b.body) return res.status(400).json({ error: "body required" });
  const comment = await addComment(req.params.id, b.authorId || "anon", b.authorHandle || "Anonymous citizen", b.body);
  if (!comment) return res.status(404).json({ error: "post not found" });
  res.json({ comment });
});

// Predictive hotspot dashboard (F9).
app.get("/api/dashboard", async (_req, res) => {
  try {
    res.json(await computeDashboard());
  } catch (err) {
    console.error("[dashboard] error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// Before/after AI verification (F7). Compares the original photo with an
// "after" photo and, if fixed, flips the issue to resolved.
app.post("/api/verify", upload.single("after"), async (req, res) => {
  try {
    const issue = await getIssue(req.body?.issueId);
    if (!issue) return res.status(404).json({ error: "issue not found" });
    const afterFile = req.file;
    if (!afterFile) return res.status(400).json({ error: "after photo required" });

    // resolve the BEFORE image bytes (uploaded photo or seeded URL)
    let before: Media | undefined;
    if (issue.photoId) {
      const p = getPhoto(issue.photoId);
      if (p) before = { buf: p.content, mime: p.mime };
    } else if (issue.photoUrl) {
      try {
        const r = await fetch(issue.photoUrl);
        before = { buf: Buffer.from(await r.arrayBuffer()), mime: r.headers.get("content-type") || "image/jpeg" };
      } catch {
        /* before unavailable → verify with after only */
      }
    }

    const after: Media = { buf: afterFile.buffer, mime: afterFile.mimetype };
    const verdict = await verifyFix(before, after, issue.issueType);

    const afterPhotoId = randomUUID();
    putPhoto(afterPhotoId, { mime: afterFile.mimetype, content: afterFile.buffer });

    const patch: Parameters<typeof updateIssue>[1] = {
      afterPhotoId,
      verification: { ...verdict, at: Date.now() },
    };
    if (verdict.fixed) {
      patch.status = "resolved";
      patch.statusHistory = [...issue.statusHistory, { status: "resolved", at: Date.now(), by: "verification" }];
    }
    const updated = await updateIssue(issue.id, patch);
    res.json({ verdict, issue: updated });
  } catch (err) {
    console.error("[verify] error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// In production, serve the built SPA from the same Cloud Run service (Docs/02 §4).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(distDir, "index.html")));
}

// Seed durable storage once (no-op for in-memory), then start.
seedIfEmpty().catch((e) => console.error("[startup] seed failed:", e));
seedCommunityIfEmpty().catch((e) => console.error("[startup] community seed failed:", e));

app.listen(env.port, () => {
  console.log("\n" + startupBanner() + "\n");
});
