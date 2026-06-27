// Client for the Community Hub (mirrors server/lib/community.ts + types).

export type PostType = "announcement" | "help" | "alert" | "poll" | "general";

export interface PollOption {
  text: string;
  votes: number;
  votedBy: string[];
}

export interface Post {
  id: string;
  createdAt: number;
  authorId: string;
  authorHandle: string;
  type: PostType;
  title?: string;
  body: string;
  area: string;
  upvotes: number;
  upvotedBy: string[];
  commentCount: number;
  pollOptions?: PollOption[];
  isDemoSeed?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  createdAt: number;
  authorId: string;
  authorHandle: string;
  body: string;
}

async function jpost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchPosts(type?: string, signal?: AbortSignal): Promise<Post[]> {
  const q = type && type !== "all" ? `?type=${type}` : "";
  const res = await fetch(`/api/community${q}`, { signal });
  if (!res.ok) throw new Error(`community ${res.status}`);
  return ((await res.json()) as { posts: Post[] }).posts;
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
  return (await jpost<{ post: Post }>("/api/community", input)).post;
}

export async function upvotePost(id: string, userId: string): Promise<Post> {
  return (await jpost<{ post: Post }>(`/api/community/${id}/upvote`, { userId })).post;
}

export async function votePoll(id: string, userId: string, optionIndex: number): Promise<Post> {
  return (await jpost<{ post: Post }>(`/api/community/${id}/poll`, { userId, optionIndex })).post;
}

export async function fetchComments(id: string): Promise<Comment[]> {
  const res = await fetch(`/api/community/${id}/comments`);
  if (!res.ok) throw new Error(`comments ${res.status}`);
  return ((await res.json()) as { comments: Comment[] }).comments;
}

export async function addComment(id: string, authorId: string, authorHandle: string, body: string): Promise<Comment> {
  return (await jpost<{ comment: Comment }>(`/api/community/${id}/comments`, { authorId, authorHandle, body })).comment;
}

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
