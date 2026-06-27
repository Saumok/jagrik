// Automated end-to-end test suite for the Jagrik backend.
// Usage: node scripts/smoke-test.mjs [BASE_URL]   (default http://localhost:8787)
// Exercises every endpoint, the streaming agent pipeline, classification accuracy,
// persistence-within-session, edge cases, and a volume injection.

const BASE = process.argv[2] || "http://localhost:8787";
const results = [];
let passed = 0,
  failed = 0;

function ok(name, cond, detail = "") {
  results.push({ name, ok: !!cond, detail });
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

async function imgBlob(seed) {
  const r = await fetch(`https://picsum.photos/seed/${seed}/640/420`);
  return await r.blob();
}

// Stream a report; returns { lines, steps, result }
async function fileReport(fields, files = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  for (const [k, blob] of Object.entries(files)) fd.set(k, blob, `${k}.jpg`);
  const res = await fetch(`${BASE}/api/report`, { method: "POST", body: fd });
  const text = await res.text();
  const lines = text.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const result = lines.find((e) => e.type === "result")?.issue;
  const steps = lines.filter((e) => e.type === "step");
  return { status: res.status, lines, steps, result };
}

async function main() {
  console.log(`\n=== Jagrik smoke test against ${BASE} ===\n`);

  // 1. HEALTH
  const health = await (await fetch(`${BASE}/api/health`)).json();
  ok("health responds ok", health.ok === true, `gemini=${health.gemini} email=${health.email} model=${health.model}`);

  // 2. ISSUES LIST (seed)
  const issues0 = (await (await fetch(`${BASE}/api/issues`)).json()).issues;
  ok("issues list seeded", issues0.length >= 30, `${issues0.length} issues`);
  const firstId = issues0[0].id;

  // 3. ISSUE BY ID
  const single = await fetch(`${BASE}/api/issues/${firstId}`);
  ok("GET issue by id", single.status === 200);
  const missing = await fetch(`${BASE}/api/issues/does-not-exist`);
  ok("unknown issue -> 404", missing.status === 404);

  // 4. REPORT — VOICE (Bengali drainage) full pipeline
  const r1 = await fileReport({
    source: "voice",
    transcript: "বাড়ির সামনের ড্রেনটা কয়েকদিন ধরে উপচে পড়ছে",
    area: "Garia Main Road, Ward 110",
    ward: "110",
  });
  ok("voice report streams 200", r1.status === 200);
  const agents = [...new Set(r1.steps.map((s) => s.agent))];
  ok("all agents present", ["classifier", "dedupe", "router", "drafter", "dispatcher", "escalator"].every((a) => agents.includes(a)), agents.join(","));
  ok("voice classified as drainage", r1.result?.issueType === "drainage", `got ${r1.result?.issueType}`);
  ok("routed to Drainage dept", /Drainage/.test(r1.result?.routedDepartment || ""), r1.result?.routedDepartment);
  const pdfCp = r1.steps.find((s) => s.checkpoint?.kind === "pdf")?.checkpoint?.value;
  const emailCp = r1.steps.find((s) => s.checkpoint?.kind === "email");
  const escCp = r1.steps.find((s) => s.checkpoint?.kind === "escalation");
  ok("PDF checkpoint emitted", !!pdfCp, pdfCp);
  ok("email checkpoint emitted", !!emailCp, emailCp?.checkpoint?.value);
  ok("escalation checkpoint emitted", !!escCp, escCp?.checkpoint?.value);
  ok("result has tracking id", /^KMC-/.test(r1.result?.trackingId || ""), r1.result?.trackingId);

  // 5. PERSISTENCE within session
  const persisted = await fetch(`${BASE}/api/issues/${r1.result.id}`);
  ok("filed report persisted (session)", persisted.status === 200);

  // 6. PDF served
  const pdf = await fetch(`${BASE}/api/pdf/${r1.result.complaintPdfId}`);
  ok("PDF downloadable 200 application/pdf", pdf.status === 200 && (pdf.headers.get("content-type") || "").includes("application/pdf"), pdf.headers.get("content-type"));

  // 7. REPORT — PHOTO, then photo served
  const r2 = await fileReport({ source: "photo", note: "huge pothole on the road", area: "Rashbehari Avenue", ward: "85" }, { image: await imgBlob("test-pothole") });
  ok("photo report streams 200", r2.status === 200, `type=${r2.result?.issueType}`);
  const photoIssue = await (await fetch(`${BASE}/api/issues/${r2.result.id}`)).json();
  ok("photo issue has photoId", !!photoIssue.issue.photoId);
  const photo = await fetch(`${BASE}/api/photo/${photoIssue.issue.photoId}`);
  ok("photo served (image/*)", photo.status === 200 && (photo.headers.get("content-type") || "").startsWith("image/"), photo.headers.get("content-type"));

  // 8. VERIFY (before/after)
  const v = await (
    await fetch(`${BASE}/api/verify`, {
      method: "POST",
      body: (() => {
        const fd = new FormData();
        fd.set("issueId", r2.result.id);
        return fd;
      })(),
    })
  ).status;
  ok("verify without photo -> 400", v === 400);

  const vfd = new FormData();
  vfd.set("issueId", r2.result.id);
  vfd.set("after", await imgBlob("test-clean-road"), "after.jpg");
  const vres = await (await fetch(`${BASE}/api/verify`, { method: "POST", body: vfd })).json();
  ok("verify returns verdict", typeof vres.verdict?.fixed === "boolean", `fixed=${vres.verdict?.fixed} conf=${vres.verdict?.confidence}`);
  ok("verify status consistent", vres.verdict.fixed ? vres.issue.status === "resolved" : vres.issue.status !== "resolved", `status=${vres.issue.status}`);

  // 9. CLASSIFICATION ACCURACY (discriminators with no keyword the fallback could catch)
  const cls = [
    { note: "the lamp post outside has not glowed for a week, it's pitch dark", expect: "streetlight" },
    { note: "a huge heap of rotting waste is piling up near the market", expect: "garbage" },
    { note: "no tap flow for three days, completely dry", expect: "water_supply" },
  ];
  for (const c of cls) {
    const rr = await fileReport({ source: "voice", note: c.note, area: "Gariahat Road", ward: "87" });
    ok(`classify -> ${c.expect}`, rr.result?.issueType === c.expect, `got ${rr.result?.issueType} (${rr.result?.routedDepartment})`);
  }

  // 10. EDGE: bad pdf id, bad verify id
  ok("unknown pdf -> 404", (await fetch(`${BASE}/api/pdf/nope`)).status === 404);
  const badVfd = new FormData();
  badVfd.set("issueId", "nope");
  badVfd.set("after", await imgBlob("x"), "a.jpg");
  ok("verify unknown issue -> 404", (await fetch(`${BASE}/api/verify`, { method: "POST", body: badVfd })).status === 404);

  // 11. DASHBOARD aggregation correctness
  const issuesBefore = (await (await fetch(`${BASE}/api/issues`)).json()).issues;
  const dash = await (await fetch(`${BASE}/api/dashboard`)).json();
  ok("dashboard total matches issues", dash.stats.total === issuesBefore.length, `dash=${dash.stats.total} list=${issuesBefore.length}`);
  const typeSum = dash.byType.reduce((s, t) => s + t.count, 0);
  ok("byType sums to total", typeSum === dash.stats.total, `sum=${typeSum}`);
  ok("trend has 8 weeks", dash.trend.length === 8);
  ok("hotspots have predictions", dash.hotspots.length > 0 && dash.hotspots.every((h) => h.prediction), `gemini=${dash.generatedByGemini}`);
  ok("resolution rate in range", dash.stats.resolutionRate >= 0 && dash.stats.resolutionRate <= 1, `${Math.round(dash.stats.resolutionRate * 100)}%`);

  // 12. VOLUME injection — file 6 reports, list grows by 6
  const before = (await (await fetch(`${BASE}/api/issues`)).json()).issues.length;
  for (let i = 0; i < 6; i++) {
    await fileReport({ source: "voice", note: `volume test pothole ${i}`, area: "Behala Chowrasta", ward: "124" });
  }
  const after = (await (await fetch(`${BASE}/api/issues`)).json()).issues.length;
  ok("volume injection grows store", after === before + 6, `${before} -> ${after}`);

  console.log(`\n=== ${passed} passed, ${failed} failed of ${passed + failed} ===\n`);
  // emit machine-readable summary for the report
  console.log("JSON_SUMMARY=" + JSON.stringify({ base: BASE, passed, failed, total: passed + failed, results }));
}

main().catch((e) => {
  console.error("TEST RUNNER CRASHED:", e);
  process.exit(1);
});
