import "server-only";
import type { BlogPost, Challenge, CommunityEvent, PublicBlogComment, PublicChallengeSolve } from "@/backend/lib/schema";

export type HomePlatformData = { blog: BlogPost[]; events: CommunityEvent[]; challenge: Challenge | null };
export type ChallengePublicData = { active: Challenge | null; leaderboard: PublicChallengeSolve[]; archive: Challenge[] };
export type BlogPostData = { post: BlogPost; comments: PublicBlogComment[] };

export async function platformFetch<T>(path: string): Promise<T> {
  if (!process.env.BACKEND_URL || !process.env.PLATFORM_API_SECRET) throw new Error("Community platform is not configured.");
  const response = await fetch(new URL(`/api/public/platform/${path}`, process.env.BACKEND_URL), {
    cache: "no-store", signal: AbortSignal.timeout(10000), headers: { "X-Platform-Key": process.env.PLATFORM_API_SECRET },
  });
  if (!response.ok) throw new Error("Community platform data is unavailable.");
  return response.json() as Promise<T>;
}

export async function platformOr<T>(path: string, fallback: T): Promise<T> {
  try { return await platformFetch<T>(path); }
  catch { return fallback; }
}
