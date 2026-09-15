import { team as demoTeam } from "@/data/content";

export type EventPreview = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  eventDate: string | null;
  placement: number | null;
  fieldSize: number | null;
  sourceUrl: string | null;
};

export type ArticlePreview = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  publishedAt: string | null;
};

export type ProjectPreview = {
  id: string;
  slug: string;
  name: string;
  description: string;
  repositoryUrl: string;
  technologies: string[];
  stars: number | null;
};

export type MemberPreview = {
  id: string;
  name: string;
  handle: string;
  specialties: string[];
  avatarUrl: string | null;
};

export type TeamPostPreview = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
  postType: string;
  event: EventPreview | null;
};

export type KnightsHomeData = {
  events: EventPreview[];
  writeups: ArticlePreview[];
  blogPosts: ArticlePreview[];
  projects: ProjectPreview[];
  members: MemberPreview[];
  updates: TeamPostPreview[];
};

const verifiedEvents: EventPreview[] = [
  {
    id: "linkedin-exploitx-into-the-void-2",
    slug: "exploitx-into-the-void-2",
    name: "ExploitX — Into The Void 2.0",
    summary:
      "1st among 120+ teams in the qualification round, then 1st among 40 teams in the finals. The public announcement says the final margin was 28 points over 2nd place.",
    eventDate: null,
    placement: 1,
    fieldSize: null,
    sourceUrl: "https://www.linkedin.com/company/kn1ghts/",
  },
  {
    id: "linkedin-blackbox-2026",
    slug: "blackbox-2026",
    name: "BLACKBOX 2026",
    summary:
      "1st Place at a story-driven cybersecurity and web engineering challenge organized by the CodeChef VIT Chennai Chapter at VIT Chennai.",
    eventDate: null,
    placement: 1,
    fieldSize: null,
    sourceUrl: "https://www.linkedin.com/company/kn1ghts/",
  },
];

const asRows = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;
const asNullableString = (value: unknown) =>
  typeof value === "string" ? value : null;
const asNumber = (value: unknown) => (typeof value === "number" ? value : null);
const asStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

function mapEvent(row: Record<string, unknown>): EventPreview {
  return {
    id: asString(row.id, asString(row.slug)),
    slug: asString(row.slug),
    name: asString(row.name),
    summary: asNullableString(row.summary),
    eventDate: asNullableString(row.event_date),
    placement: asNumber(row.placement),
    fieldSize: asNumber(row.field_size),
    sourceUrl: asNullableString(row.source_url),
  };
}

function mapArticle(row: Record<string, unknown>): ArticlePreview {
  return {
    id: asString(row.id, asString(row.slug)),
    slug: asString(row.slug),
    title: asString(row.title),
    excerpt: asNullableString(row.excerpt),
    category: asNullableString(row.category),
    publishedAt: asNullableString(row.published_at),
  };
}

async function readPublicTable(path: string): Promise<Record<string, unknown>[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];

  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!response.ok) return [];
    return asRows(await response.json());
  } catch {
    return [];
  }
}

export async function getKnightsHomeData(): Promise<KnightsHomeData> {
  const [eventsRows, writeupRows, blogRows, projectRows, memberRows, postRows] =
    await Promise.all([
      readPublicTable(
        "events?select=id,slug,name,summary,event_date,placement,field_size,source_url&status=eq.published&order=event_date.desc&limit=6",
      ),
      readPublicTable(
        "articles?select=id,slug,title,excerpt,category,published_at&status=eq.published&kind=eq.writeup&order=published_at.desc&limit=4",
      ),
      readPublicTable(
        "articles?select=id,slug,title,excerpt,category,published_at&status=eq.published&kind=eq.blog&order=published_at.desc&limit=4",
      ),
      readPublicTable(
        "projects?select=id,slug,name,description,repository_url,technologies,stars&status=eq.published&order=published_at.desc&limit=4",
      ),
      readPublicTable(
        "members?select=id,name,handle,specialties,avatar_url&status=eq.published&order=display_order&limit=8",
      ),
      readPublicTable(
        "team_posts?select=id,slug,title,excerpt,published_at,post_type,event:events(id,slug,name,summary,event_date,placement,field_size,source_url)&status=eq.published&order=published_at.desc&limit=4",
      ),
    ]);

  const events = eventsRows.length ? eventsRows.map(mapEvent) : verifiedEvents;
  const members: MemberPreview[] = memberRows.map((row) => ({
    id: asString(row.id, asString(row.handle)),
    name: asString(row.name),
    handle: asString(row.handle),
    specialties: asStringArray(row.specialties),
    avatarUrl: asNullableString(row.avatar_url),
  }));
  const updates: TeamPostPreview[] = postRows.map((row) => {
    const event = asRows([row.event])[0];
    return {
      id: asString(row.id, asString(row.slug)),
      slug: asString(row.slug),
      title: asString(row.title),
      excerpt: asNullableString(row.excerpt),
      publishedAt: asNullableString(row.published_at),
      postType: asString(row.post_type, "team_update"),
      event: event ? mapEvent(event) : null,
    };
  });

  return {
    events,
    writeups: writeupRows.map(mapArticle),
    blogPosts: blogRows.map(mapArticle),
    projects: projectRows.map((row) => ({
      id: asString(row.id, asString(row.slug)),
      slug: asString(row.slug),
      name: asString(row.name),
      description: asString(row.description),
      repositoryUrl: asString(row.repository_url, "https://github.com/Kn1ghts-org"),
      technologies: asStringArray(row.technologies),
      stars: asNumber(row.stars),
    })),
    members: members.length ? members : demoTeam.map((member, index) => ({
      id: `demo-${index}`,
      name: member.handle,
      handle: member.handle,
      specialties: [member.role, member.spec],
      avatarUrl: member.image,
    })),
    updates: updates.length
      ? updates
      : events.slice(0, 2).map((event) => ({
          id: `event-${event.id}`,
          slug: event.slug,
          title: event.name,
          excerpt: event.summary,
          publishedAt: event.eventDate,
          postType: "ctf_result",
          event,
        })),
  };
}
