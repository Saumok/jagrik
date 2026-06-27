import { randomUUID } from "node:crypto";
import { firestore } from "./firebase.js";
import type { Post, Comment, PostType, PollOption } from "../types.js";

// Community Hub store: posts (announcements / help / alerts / polls / general)
// + comments, with upvotes and poll voting. Firestore-backed (durable) with an
// in-memory fallback. This is the social space that turns reports into action.

const POSTS = "posts";
const COMMENTS = "comments";
const now = Date.now();

const memPosts = new Map<string, Post>();
const memComments = new Map<string, Comment>();

function seedPosts(): Post[] {
  const mk = (
    id: string,
    ageH: number,
    authorHandle: string,
    type: PostType,
    body: string,
    area: string,
    upvotes: number,
    commentCount = 0,
    title?: string,
    pollOptions?: PollOption[],
  ): Post => ({
    id,
    createdAt: now - ageH * 60 * 60 * 1000,
    authorId: `seed-${id}`,
    authorHandle,
    type,
    title,
    body,
    area,
    upvotes,
    upvotedBy: [],
    commentCount,
    pollOptions,
    isDemoSeed: true,
  });
  return [
    mk("p-alert-1", 3, "Ashok Das", "alert", "Open manhole near Garia station, no cover since morning. Please avoid the lane after dark, it's dangerous.", "Garia Main Road", 34, 5),
    mk("p-help-1", 8, "Riya Sen", "help", "Organising a lake-cleanup this Saturday 7am at Lake Gardens. Need 10 volunteers and a few gloves/bags. Drop a comment if you can join.", "Lake Gardens", 21, 8),
    mk(
      "p-poll-1",
      14,
      "Ward 89 RWA",
      "poll",
      "We can push the corporation to prioritise one fix this month. Which matters most to you?",
      "Ward 89",
      12,
      3,
      "Which should we get fixed first?",
      [
        { text: "Drainage on the main road", votes: 18, votedBy: [] },
        { text: "Potholes near the school", votes: 11, votedBy: [] },
        { text: "Dead streetlights", votes: 7, votedBy: [] },
      ],
    ),
    mk("p-ann-1", 26, "KMC Borough VII", "announcement", "Water tanker timing for Ward 110 changes to 8–10am from Monday due to pipeline maintenance. Please store water accordingly.", "Ward 110", 9, 1),
    mk("p-gen-1", 40, "Priya Mukherjee", "general", "Huge thanks to everyone who reported the dead streetlight on 8B — it's finally fixed and the lane feels safe again at night. This is what we can do together.", "Jadavpur 8B", 47, 6),
    mk("p-help-2", 52, "Sourav R.", "help", "Elderly neighbour on Rashbehari needs help getting groceries this week. If anyone nearby can spare an hour, please reach out.", "Rashbehari Avenue", 15, 2),
  ];
}

if (!firestore) for (const p of seedPosts()) memPosts.set(p.id, p);

export async function seedCommunityIfEmpty(): Promise<void> {
  if (!firestore) return;
  const snap = await firestore.collection(POSTS).limit(1).get();
  if (!snap.empty) return;
  const batch = firestore.batch();
  for (const p of seedPosts()) batch.set(firestore.collection(POSTS).doc(p.id), p);
  await batch.commit();
  console.log("[firestore] seeded community posts");
}

export async function listPosts(type?: string): Promise<Post[]> {
  let posts: Post[];
  if (firestore) {
    const snap = await firestore.collection(POSTS).orderBy("createdAt", "desc").get();
    posts = snap.docs.map((d) => d.data() as Post);
  } else {
    posts = [...memPosts.values()].sort((a, b) => b.createdAt - a.createdAt);
  }
  return type && type !== "all" ? posts.filter((p) => p.type === type) : posts;
}

export async function getPost(id: string): Promise<Post | undefined> {
  if (firestore) {
    const d = await firestore.collection(POSTS).doc(id).get();
    return d.exists ? (d.data() as Post) : undefined;
  }
  return memPosts.get(id);
}

async function savePost(p: Post): Promise<void> {
  if (firestore) await firestore.collection(POSTS).doc(p.id).set(p);
  else memPosts.set(p.id, p);
}

export interface NewPost {
  authorId: string;
  authorHandle: string;
  type: PostType;
  title?: string;
  body: string;
  area?: string;
  pollOptions?: string[];
}

export async function createPost(input: NewPost): Promise<Post> {
  const post: Post = {
    id: `post-${randomUUID()}`,
    createdAt: Date.now(),
    authorId: input.authorId,
    authorHandle: input.authorHandle,
    type: input.type,
    title: input.title,
    body: input.body,
    area: input.area || "Your area",
    upvotes: 0,
    upvotedBy: [],
    commentCount: 0,
    pollOptions:
      input.type === "poll" && input.pollOptions?.length
        ? input.pollOptions.filter(Boolean).map((t) => ({ text: t, votes: 0, votedBy: [] }))
        : undefined,
  };
  await savePost(post);
  return post;
}

export async function toggleUpvote(id: string, userId: string): Promise<Post | undefined> {
  const post = await getPost(id);
  if (!post) return undefined;
  if (post.upvotedBy.includes(userId)) {
    post.upvotedBy = post.upvotedBy.filter((u) => u !== userId);
    post.upvotes = Math.max(0, post.upvotes - 1);
  } else {
    post.upvotedBy.push(userId);
    post.upvotes += 1;
  }
  await savePost(post);
  return post;
}

export async function votePoll(id: string, userId: string, optionIndex: number): Promise<Post | undefined> {
  const post = await getPost(id);
  if (!post || !post.pollOptions || optionIndex < 0 || optionIndex >= post.pollOptions.length) return post;
  if (post.pollOptions.some((o) => o.votedBy.includes(userId))) return post; // one vote per user
  post.pollOptions[optionIndex].votes += 1;
  post.pollOptions[optionIndex].votedBy.push(userId);
  await savePost(post);
  return post;
}

export async function listComments(postId: string): Promise<Comment[]> {
  let comments: Comment[];
  if (firestore) {
    const snap = await firestore.collection(COMMENTS).where("postId", "==", postId).get();
    comments = snap.docs.map((d) => d.data() as Comment);
  } else {
    comments = [...memComments.values()].filter((c) => c.postId === postId);
  }
  return comments.sort((a, b) => a.createdAt - b.createdAt);
}

export async function addComment(postId: string, authorId: string, authorHandle: string, body: string): Promise<Comment | undefined> {
  const post = await getPost(postId);
  if (!post) return undefined;
  const comment: Comment = {
    id: `c-${randomUUID()}`,
    postId,
    createdAt: Date.now(),
    authorId,
    authorHandle,
    body,
  };
  if (firestore) await firestore.collection(COMMENTS).doc(comment.id).set(comment);
  else memComments.set(comment.id, comment);
  post.commentCount += 1;
  await savePost(post);
  return comment;
}
