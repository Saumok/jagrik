import express from "express";
import cors from "cors";
import multer from "multer";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { env, flags, startupBanner } from "./env.js";
import { runReport } from "./orchestrator.js";
import { getPdf, getPhoto, putPhoto } from "./lib/store.js";
import { listIssues, getIssue, updateIssue } from "./lib/issuesStore.js";
import { verifyFix, type Media } from "./lib/gemini.js";
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
app.get("/api/issues", (_req, res) => res.json({ issues: listIssues() }));
app.get("/api/issues/:id", (req, res) => {
  const issue = getIssue(req.params.id);
  if (!issue) return res.status(404).json({ error: "not found" });
  res.json({ issue });
});

// Before/after AI verification (F7). Compares the original photo with an
// "after" photo and, if fixed, flips the issue to resolved.
app.post("/api/verify", upload.single("after"), async (req, res) => {
  try {
    const issue = getIssue(req.body?.issueId);
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
    const updated = updateIssue(issue.id, patch);
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

app.listen(env.port, () => {
  console.log("\n" + startupBanner() + "\n");
});
