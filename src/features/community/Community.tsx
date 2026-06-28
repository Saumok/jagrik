import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  Megaphone,
  Handshake,
  Warning,
  ChartBar,
  ChatCircle,
  ArrowFatUp,
  ChatCircleText,
  PaperPlaneRight,
  Plus,
  MapPin,
  X,
} from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import { GlassButton } from "@/components/GlassButton";
import { LiquidTabs, type TabItem } from "@/components/LiquidTabs";
import { AuroraBackground } from "@/components/AuroraBackground";
import { ScoreChip } from "@/components/ScoreChip";
import { BottomNav } from "@/components/BottomNav";
import { BackButton } from "@/components/BackButton";
import { getIdentity, initials } from "@/lib/identity";
import {
  fetchPosts,
  createPost,
  upvotePost,
  votePoll,
  fetchComments,
  addComment,
  timeAgo,
  type Post,
  type PostType,
  type Comment,
} from "@/lib/communityApi";

const EASE = [0.16, 1, 0.3, 1] as const;

const TYPE_META: Record<PostType, { label: string; color: string; icon: ComponentType<{ size?: number; weight?: "fill" | "bold" }> }> = {
  announcement: { label: "Announcement", color: "var(--color-teal)", icon: Megaphone },
  help: { label: "Help needed", color: "var(--color-marigold-deep)", icon: Handshake },
  alert: { label: "Alert", color: "var(--color-danger)", icon: Warning },
  poll: { label: "Poll", color: "var(--color-status-progress)", icon: ChartBar },
  general: { label: "Update", color: "var(--color-muted)", icon: ChatCircle },
};

const FILTERS: TabItem[] = [
  { id: "all", label: "All", icon: <ChatCircle size={16} weight="fill" /> },
  { id: "announcement", label: "News", icon: <Megaphone size={16} weight="fill" /> },
  { id: "help", label: "Help", icon: <Handshake size={16} weight="fill" /> },
  { id: "alert", label: "Alerts", icon: <Warning size={16} weight="fill" /> },
  { id: "poll", label: "Polls", icon: <ChartBar size={16} weight="fill" /> },
];
const FILTER_TYPE = ["all", "announcement", "help", "alert", "poll"] as const;

export function Community() {
  const me = useMemo(() => getIdentity(), []);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState(0);
  const [area, setArea] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetchPosts(undefined, ac.signal)
      .then(setPosts)
      .catch((e) => e.name !== "AbortError" && setError(true));
    navigator.geolocation?.getCurrentPosition(
      async (p) => {
        try {
          const r = await fetch(`/api/geocode?lat=${p.coords.latitude}&lng=${p.coords.longitude}`);
          if (r.ok) {
            const d = (await r.json()) as { area: string | null };
            if (d.area) setArea(d.area);
          }
        } catch {
          /* ignore */
        }
      },
      () => {},
      { timeout: 8000 },
    );
    return () => ac.abort();
  }, []);

  const shown = posts?.filter((p) => filter === 0 || p.type === FILTER_TYPE[filter]) ?? [];

  return (
    <div className="relative min-h-[100dvh] px-4 pb-28 pt-5 md:px-8 md:pb-20">
      <AuroraBackground />
      <BottomNav />

      <header className="mx-auto flex max-w-3xl items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BackButton />
          <Link to="/" aria-label="Home" className="hidden sm:inline-flex">
            <Logo />
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/leaderboard" className="hidden rounded-full px-4 py-2 text-[0.95rem] text-muted hover:text-ink sm:inline-flex">
            Leaderboard
          </Link>
          <Link to="/app" className="hidden rounded-full px-4 py-2 text-[0.95rem] text-muted hover:text-ink sm:inline-flex">
            Issues
          </Link>
          <ScoreChip />
          <GlassButton to="/report" variant="act" className="!min-h-[44px] !px-5 !text-[0.95rem]">
            <Plus size={17} weight="bold" /> Report
          </GlassButton>
        </div>
      </header>

      <div className="mx-auto mt-8 max-w-3xl">
        <h1 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-semibold text-ink">Community</h1>
        <p className="mt-1.5 inline-flex items-center gap-2 text-muted">
          Your neighbours, organising together
          {area && (
            <span className="glass glass-edge inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.82rem] text-text">
              <MapPin size={13} weight="fill" className="text-teal" /> {area}
            </span>
          )}
        </p>

        <Composer me={me} area={area} onPosted={(p) => setPosts((cur) => [p, ...(cur ?? [])])} />

        <div className="mt-6">
          <LiquidTabs tabs={FILTERS} active={filter} onChange={setFilter} fill />
        </div>

        {error && <div className="glass glass-edge mt-6 rounded-[20px] p-6 text-muted">Couldn't load the community feed. Is the backend running?</div>}

        {!posts && !error && (
          <div className="mt-6 grid gap-4">
            {[0, 1, 2].map((i) => <div key={i} className="glass glass-edge h-40 animate-pulse rounded-[22px]" />)}
          </div>
        )}

        {posts && shown.length === 0 && (
          <div className="glass glass-edge mt-6 rounded-[20px] p-8 text-center">
            <p className="font-display text-[1.2rem] text-ink">Nothing here yet</p>
            <p className="mt-1 text-muted">Be the first to post.</p>
          </div>
        )}

        <div className="mt-6 grid gap-4">
          <AnimatePresence initial={false}>
            {shown.map((post) => (
              <PostCard key={post.id} post={post} meId={me.id} meHandle={me.handle} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Composer({ me, area, onPosted }: { me: { id: string; handle: string }; area: string | null; onPosted: (p: Post) => void }) {
  const [type, setType] = useState<PostType>("general");
  const [body, setBody] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState(false);

  const types: PostType[] = ["general", "announcement", "help", "alert", "poll"];

  async function submit() {
    if (!body.trim() || busy) return;
    setBusy(true);
    try {
      const post = await createPost({
        authorId: me.id,
        authorHandle: me.handle,
        type,
        body: body.trim(),
        area: area ?? undefined,
        pollOptions: type === "poll" ? options.map((o) => o.trim()).filter(Boolean) : undefined,
      });
      onPosted(post);
      setBody("");
      setOptions(["", ""]);
      setType("general");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass glass-edge mt-6 rounded-[22px] p-4">
      <div className="flex flex-wrap gap-1.5">
        {types.map((t) => {
          const m = TYPE_META[t];
          const Icon = m.icon;
          const active = t === type;
          return (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.85rem] font-medium transition-colors ${active ? "text-white" : "text-muted hover:text-ink"}`}
              style={active ? { background: m.color } : { background: "var(--color-nude-200)" }}
            >
              <Icon size={14} weight="fill" /> {m.label}
            </button>
          );
        })}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={type === "help" ? "What do you need help with?" : type === "alert" ? "What should neighbours watch out for?" : type === "poll" ? "Ask your neighbours a question…" : "Share something with your community…"}
        className="mt-3 w-full resize-none rounded-[16px] bg-nude-150/70 px-4 py-3 text-ink placeholder:text-faint focus:outline-none"
      />

      {type === "poll" && (
        <div className="mt-2 grid gap-2">
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={o}
                onChange={(e) => setOptions((cur) => cur.map((v, j) => (j === i ? e.target.value : v)))}
                placeholder={`Option ${i + 1}`}
                className="flex-1 rounded-[12px] bg-nude-150/70 px-3 py-2 text-[0.95rem] text-ink placeholder:text-faint focus:outline-none"
              />
              {options.length > 2 && (
                <button onClick={() => setOptions((cur) => cur.filter((_, j) => j !== i))} className="text-faint hover:text-danger">
                  <X size={16} weight="bold" />
                </button>
              )}
            </div>
          ))}
          {options.length < 4 && (
            <button onClick={() => setOptions((cur) => [...cur, ""])} className="justify-self-start text-[0.85rem] text-teal-deep">
              + Add option
            </button>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[0.82rem] text-faint">Posting as {me.handle}</span>
        <GlassButton variant="primary" onClick={submit} className={`!min-h-[42px] !px-5 !text-[0.92rem] ${body.trim() ? "" : "pointer-events-none opacity-50"}`}>
          {busy ? "Posting…" : "Post"}
        </GlassButton>
      </div>
    </div>
  );
}

function PostCard({ post: initial, meId, meHandle }: { post: Post; meId: string; meHandle: string }) {
  const reduce = useReducedMotion();
  const [post, setPost] = useState(initial);
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const busy = useRef(false);

  const m = TYPE_META[post.type];
  const Icon = m.icon;
  const upvoted = post.upvotedBy.includes(meId);
  const votedPoll = post.pollOptions?.some((o) => o.votedBy.includes(meId));
  const pollTotal = post.pollOptions?.reduce((s, o) => s + o.votes, 0) ?? 0;

  async function toggleUp() {
    if (busy.current) return;
    busy.current = true;
    try {
      setPost(await upvotePost(post.id, meId));
    } finally {
      busy.current = false;
    }
  }

  async function castVote(i: number) {
    if (votedPoll) return;
    setPost(await votePoll(post.id, meId, i));
  }

  async function openComments() {
    setOpen((o) => !o);
    if (comments === null) setComments(await fetchComments(post.id));
  }

  async function postComment() {
    if (!commentBody.trim()) return;
    const c = await addComment(post.id, meId, meHandle, commentBody.trim());
    setComments((cur) => [...(cur ?? []), c]);
    setCommentBody("");
    setPost((p) => ({ ...p, commentCount: p.commentCount + 1 }));
  }

  return (
    <motion.div
      layout
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="glass glass-edge rounded-[22px] p-5"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full font-display text-[0.9rem] font-semibold text-white" style={{ background: m.color }}>
          {initials(post.authorHandle)}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">{post.authorHandle}</span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium" style={{ background: `color-mix(in srgb, ${m.color} 16%, transparent)`, color: m.color }}>
              <Icon size={11} weight="fill" /> {m.label}
            </span>
          </div>
          <div className="text-[12px] text-muted">{post.area} · {timeAgo(post.createdAt)}</div>
        </div>
      </div>

      {post.title && <h3 className="mt-3 font-display text-[1.15rem] font-medium text-ink">{post.title}</h3>}
      <p className="mt-2 leading-relaxed text-text/90">{post.body}</p>

      {post.pollOptions && (
        <div className="mt-3 grid gap-2">
          {post.pollOptions.map((o, i) => {
            const pct = pollTotal ? Math.round((o.votes / pollTotal) * 100) : 0;
            const mine = o.votedBy.includes(meId);
            return (
              <button
                key={i}
                onClick={() => castVote(i)}
                disabled={!!votedPoll}
                className="relative overflow-hidden rounded-[12px] border border-nude-200 px-3.5 py-2.5 text-left disabled:cursor-default"
              >
                {votedPoll && (
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-[12px]"
                    style={{ background: `color-mix(in srgb, ${m.color} 18%, transparent)` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: EASE }}
                  />
                )}
                <span className="relative flex items-center justify-between text-[0.95rem]">
                  <span className={mine ? "font-medium text-ink" : "text-text"}>{o.text}</span>
                  {votedPoll && <span className="font-mono text-[0.85rem] text-muted">{pct}%</span>}
                </span>
              </button>
            );
          })}
          {votedPoll && <div className="text-[11px] text-faint">{pollTotal} votes</div>}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-nude-200/60 pt-3">
        <button
          onClick={toggleUp}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.9rem] font-medium transition-colors ${upvoted ? "glass-teal text-teal-deep" : "text-muted hover:text-ink"}`}
        >
          <ArrowFatUp size={16} weight={upvoted ? "fill" : "regular"} /> {post.upvotes}
        </button>
        <button onClick={openComments} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.9rem] font-medium text-muted hover:text-ink">
          <ChatCircleText size={16} weight="regular" /> {post.commentCount}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3 grid gap-3">
              {comments === null ? (
                <div className="text-[0.9rem] text-faint">Loading…</div>
              ) : comments.length === 0 ? (
                <div className="text-[0.9rem] text-faint">No comments yet. Start the conversation.</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-nude-300 text-[0.7rem] font-semibold text-ink">{initials(c.authorHandle)}</span>
                    <div className="rounded-[14px] bg-nude-150/70 px-3.5 py-2">
                      <div className="text-[12px] font-medium text-ink">{c.authorHandle} <span className="font-normal text-faint">· {timeAgo(c.createdAt)}</span></div>
                      <div className="text-[0.92rem] text-text/90">{c.body}</div>
                    </div>
                  </div>
                ))
              )}

              <div className="flex items-center gap-2">
                <input
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && postComment()}
                  placeholder="Add a comment…"
                  className="flex-1 rounded-full bg-nude-150/70 px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint focus:outline-none"
                />
                <button onClick={postComment} className="grid h-10 w-10 shrink-0 place-items-center rounded-full glass-teal text-teal-deep">
                  <PaperPlaneRight size={17} weight="fill" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
