// One-off: remove the smoke-test artefacts from Firestore, then seed the demo
// leaderboard. Safe to re-run — seeding is idempotent.
import "dotenv/config";
import { firestore } from "../server/lib/firebase.js";
import { seedCitizensIfEmpty, leaderboard } from "../server/lib/citizens.js";
import { reseedIssues } from "../server/lib/issuesStore.js";

async function main() {
  if (!firestore) {
    console.log("No Firestore (in-memory mode) — nothing to clean. Seeds load at server start.");
    return;
  }

  // 1. delete the test citizen
  await firestore.collection("citizens").doc("u-test1").delete().catch(() => {});

  // 2. delete any test posts (the smoke-test body) + their comments
  const posts = await firestore.collection("posts").where("authorId", "==", "u-test1").get();
  for (const p of posts.docs) {
    const comments = await firestore.collection("comments").where("postId", "==", p.id).get();
    for (const c of comments.docs) await c.ref.delete();
    await p.ref.delete();
  }
  console.log(`Cleaned ${posts.size} test post(s) + comments and the test citizen.`);

  // 2b. drop existing demo seeds so corrected values re-seed (real citizens kept)
  const seeded = await firestore.collection("citizens").get();
  let dropped = 0;
  for (const d of seeded.docs) {
    if (d.id.startsWith("seed-citizen-")) {
      await d.ref.delete();
      dropped++;
    }
  }
  if (dropped) console.log(`Dropped ${dropped} old demo seed(s) to refresh.`);

  // 2c. refresh demo issues so verification + before/after seeds roll out
  const n = await reseedIssues();
  console.log(`Re-seeded ${n} demo issues (with before/after verification).`);

  // 2d. clear any prior auto-celebrate posts so the feed isn't duplicated
  const sys = await firestore.collection("posts").where("authorId", "==", "jagrik-system").get();
  for (const p of sys.docs) await p.ref.delete();
  if (sys.size) console.log(`Cleared ${sys.size} old celebration post(s).`);

  // 3. seed the demo board (force: real users may already exist alongside seeds)
  await seedCitizensIfEmpty(true);
  const board = await leaderboard();
  console.log(`Leaderboard now has ${board.citizens.length} citizens across ${board.areas.length} areas:`);
  for (const c of board.citizens) console.log(`  #${c.rank}  ${c.handle.padEnd(16)} ${String(c.score).padStart(4)} pts  ${c.level}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
