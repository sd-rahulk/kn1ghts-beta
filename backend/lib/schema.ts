import { z } from "zod";

export const SECTION_TYPES = ["hero", "updates", "about", "disciplines", "results", "writeups", "projects", "team", "journal", "events", "challenge", "blog", "recruitment", "finale", "contact", "content"] as const;
export const sectionTypeNames: Record<(typeof SECTION_TYPES)[number], string> = {
  hero: "Hero", updates: "Updates", about: "About / manifesto", disciplines: "Disciplines", results: "Results",
  writeups: "Writeups", projects: "Projects", team: "Team", journal: "Journal", events: "Events",
  challenge: "Weekly challenge", blog: "Blog", recruitment: "Recruitment",
  finale: "Closing section", contact: "Contact form", content: "Text & cards",
};

export function isSafeLink(value: string) {
  if (!value) return true;
  if (/^#[a-z][a-z0-9-]{0,63}$/.test(value)) return true;
  if (/^\/(?!\/)[^\s\\]*$/.test(value)) return !value.includes("..");
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

const text = z.string().max(20000);
const shortText = z.string().max(250);
const link = z.string().max(2000).refine(isSafeLink, "Use an http(s) URL, a local path, or a section anchor.");
const id = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/, "IDs must start with a letter and contain only lowercase letters, numbers, or hyphens.");
const strings = z.array(shortText).max(30).nullish().transform((value) => value ?? []);
const fields = z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/), text).nullish().transform((value) => value ?? {});
export const itemSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
  title: shortText.default(""), body: text.default(""), label: shortText.default(""),
  href: link.default(""), imageUrl: link.default(""), date: z.string().max(40).default(""),
  meta: shortText.default(""), tags: strings,
}).strict();
export const sectionSchema = z.object({
  id, type: z.enum(SECTION_TYPES), enabled: z.boolean(),
  eyebrow: shortText, title: text, description: text,
  fields,
  items: z.array(itemSchema).max(100).nullish().transform((value) => value ?? []),
}).strict();
const navigationSchema = z.object({ label: shortText.min(1), href: link.min(1) }).strict();
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const siteSchema = z.object({
  schemaVersion: z.literal(1),
  settings: z.object({
    name: shortText.min(1), registrationMark: z.string().max(8), headerLine: shortText,
    title: shortText.min(1), description: z.string().max(500), copyright: shortText,
    publicUrl: link,
    navigation: z.array(navigationSchema).max(20).nullish().transform((value) => value ?? []),
    footerLinks: z.array(navigationSchema).max(20).nullish().transform((value) => value ?? []),
    theme: z.object({ ink: color, deep: color, tactical: color, paper: color, soft: color, accent: color }).strict(),
    labels: z.object({
      skipIntro: shortText, entering: shortText, skipContent: shortText, openMenu: shortText,
      closeMenu: shortText, backToTop: shortText, fieldReport: shortText, profile: shortText,
    }).strict(),
    contact: z.object({
      enabled: z.boolean(), nameLabel: shortText, emailLabel: shortText, messageLabel: shortText,
      namePlaceholder: shortText, emailPlaceholder: shortText, messagePlaceholder: shortText,
      buttonLabel: shortText, sendingLabel: shortText, successMessage: shortText, unavailableMessage: shortText,
    }).strict(),
  }).strict(),
  sections: z.array(sectionSchema).min(1).max(32),
}).strict().superRefine((site, ctx) => {
  const ids = new Set<string>();
  site.sections.forEach((section, index) => {
    if (ids.has(section.id) || section.id === "story") ctx.addIssue({ code: "custom", path: ["sections", index, "id"], message: "Section IDs must be unique; story is reserved." });
    ids.add(section.id);
    const itemIds = section.items.map((item) => item.id);
    if (new Set(itemIds).size !== itemIds.length) ctx.addIssue({ code: "custom", path: ["sections", index, "items"], message: "Item IDs must be unique within a section." });
    for (const [key, value] of Object.entries(section.fields)) {
      if (/(?:href|url)$/i.test(key) && !isSafeLink(value)) ctx.addIssue({ code: "custom", path: ["sections", index, "fields", key], message: "This link is not a safe URL." });
    }
  });
  if (!site.sections.some((section) => section.enabled)) ctx.addIssue({ code: "custom", path: ["sections"], message: "Keep at least one section visible." });
  if (site.sections.filter((section) => section.type === "contact").length > 1) ctx.addIssue({ code: "custom", path: ["sections"], message: "Use one contact form section." });
  for (const [group, links] of [["navigation", site.settings.navigation], ["footerLinks", site.settings.footerLinks]] as const) {
    links.forEach((entry, index) => {
      if (entry.href.startsWith("#") && !ids.has(entry.href.slice(1))) ctx.addIssue({ code: "custom", path: ["settings", group, index, "href"], message: "Choose a section that exists." });
    });
  }
  if (JSON.stringify(site).length > 250000) ctx.addIssue({ code: "custom", message: "Content must fit within 250 KB. Use image URLs rather than embedded images." });
});

export type SiteContent = z.infer<typeof siteSchema>;
export type SiteSection = z.infer<typeof sectionSchema>;
export type SectionItem = z.infer<typeof itemSchema>;
export type MemberRole = "owner" | "editor" | "viewer";
export type Actor = { uid: string; email: string; role: MemberRole };
export type Change = { path: string; before: string; after: string };
export type Revision = { id: string; kind: "save" | "publish" | "restore"; at: number; actor: Actor; note: string; version: number; changes: Change[]; content: SiteContent };
export type Member = { uid: string; email: string; role: MemberRole; active: boolean; createdAt: number };
export type Message = { id: string; kind?: "contact" | "joining"; name: string; email: string; message: string; createdAt: number; status: "new" | "read" | "archived"; notes: string; application?: { handle: string; discipline: string; portfolioUrl: string }; events?: Record<string, { at: number; actor: Actor; action: string }> };

const resourceId = z.string().regex(/^[a-z0-9][a-z0-9-]{0,95}$/);
const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(96);
const timestamp = z.number().int().nonnegative();
// Realtime Database removes keys written as null. Normalize missing optional
// timestamps back to null when records are read.
const optionalTimestamp = timestamp.nullish().transform((value) => value ?? null);
const publicHandle = z.string().trim().regex(/^[A-Za-z0-9_-]{3,24}$/, "Use 3–24 letters, numbers, underscores, or hyphens.");

export const publicProfileInputSchema = z.object({ handle: publicHandle }).strict();
export const publicProfileSchema = z.object({
  uid: z.string().min(1).max(128), email: z.email().max(254), handle: publicHandle,
  handleKey: z.string().min(3).max(24), createdAt: timestamp, updatedAt: timestamp,
}).strict();
export type PublicProfile = z.infer<typeof publicProfileSchema>;
export type PublicProfileView = Pick<PublicProfile, "uid" | "handle" | "createdAt">;

export const blogPostInputSchema = z.object({
  slug, title: shortText.min(3), excerpt: z.string().trim().min(10).max(600),
  content: z.string().trim().min(20).max(100000), coverImageUrl: link.default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  status: z.enum(["draft", "published"]).default("draft"),
}).strict();
export const blogPostSchema = blogPostInputSchema.extend({
  id: resourceId, createdAt: timestamp, updatedAt: timestamp, publishedAt: optionalTimestamp,
  author: z.object({ uid: z.string(), email: z.email() }).strict(),
}).strict();
export type BlogPost = z.infer<typeof blogPostSchema>;

export const blogCommentInputSchema = z.object({ body: z.string().trim().min(2).max(3000) }).strict();
export const blogCommentSchema = z.object({
  id: resourceId, postId: resourceId, uid: z.string().min(1).max(128), handle: publicHandle,
  body: z.string().min(2).max(3000), status: z.enum(["pending", "approved", "hidden"]),
  createdAt: timestamp, moderatedAt: optionalTimestamp,
  moderator: z.object({ uid: z.string(), email: z.email() }).strict().nullish().transform((value) => value ?? null),
}).strict();
export type BlogComment = z.infer<typeof blogCommentSchema>;
export type PublicBlogComment = Pick<BlogComment, "id" | "postId" | "handle" | "body" | "createdAt">;

export const challengeInputSchema = z.object({
  slug, title: shortText.min(3), description: z.string().trim().min(20).max(20000),
  category: shortText.min(2), difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  resourceUrl: link.default(""), opensAt: timestamp, closesAt: optionalTimestamp,
  status: z.enum(["draft", "published", "closed"]).default("draft"),
  flag: z.string().trim().max(500).default(""),
}).strict();
export const challengeSchema = challengeInputSchema.omit({ flag: true }).extend({
  id: resourceId, createdAt: timestamp, updatedAt: timestamp,
  author: z.object({ uid: z.string(), email: z.email() }).strict(),
}).strict();
export type Challenge = z.infer<typeof challengeSchema>;
export const challengeSubmissionSchema = z.object({ flag: z.string().trim().min(1).max(500) }).strict();
export const challengeSolveSchema = z.object({
  challengeId: resourceId, uid: z.string().min(1).max(128), handle: publicHandle, solvedAt: timestamp,
}).strict();
export type ChallengeSolve = z.infer<typeof challengeSolveSchema>;
export type PublicChallengeSolve = Pick<ChallengeSolve, "handle" | "solvedAt">;
export const challengeAttemptSchema = z.object({
  id: resourceId, uid: z.string().min(1).max(128), correct: z.boolean(), createdAt: timestamp,
}).strict();
export type ChallengeAttempt = z.infer<typeof challengeAttemptSchema>;
export type ChallengeAttemptView = ChallengeAttempt & { handle: string };

export const eventInputSchema = z.object({
  title: shortText.min(3), description: z.string().trim().min(10).max(10000), location: shortText,
  startsAt: timestamp, endsAt: optionalTimestamp, registrationUrl: link.default(""),
  status: z.enum(["draft", "published", "cancelled"]).default("draft"),
}).strict();
export const eventSchema = eventInputSchema.extend({
  id: resourceId, createdAt: timestamp, updatedAt: timestamp,
  author: z.object({ uid: z.string(), email: z.email() }).strict(),
}).strict();
export type CommunityEvent = z.infer<typeof eventSchema>;

export const joiningApplicationSchema = z.object({
  name: z.string().trim().min(2).max(100), email: z.email().max(254), handle: publicHandle,
  discipline: shortText.min(2), portfolioUrl: link.default(""),
  message: z.string().trim().min(20).max(5000), website: z.string().max(200).default(""),
}).strict();

export const auditEventSchema = z.object({
  id: resourceId, at: timestamp, actor: z.object({ uid: z.string(), email: z.email(), role: z.enum(["owner", "editor", "viewer"]) }).strict(),
  resource: z.enum(["blog", "comment", "challenge", "event", "application", "profile"]),
  resourceId, action: z.string().max(80), summary: z.string().max(500),
}).strict();
export type AuditEvent = z.infer<typeof auditEventSchema>;

export const memberRoleSchema = z.enum(["owner", "editor", "viewer"]);
export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100), email: z.email().max(254),
  message: z.string().trim().min(10).max(5000), website: z.string().max(200).default(""),
}).strict();

export function availableLink(site: SiteContent, href: string) {
  return !href.startsWith("#") || site.sections.some((section) => section.enabled && section.id === href.slice(1));
}

export function diffContent(before: unknown, after: unknown): Change[] {
  const changes: Change[] = [];
  const repr = (value: unknown) => value === undefined ? "(missing)" : typeof value === "string" ? value : JSON.stringify(value);
  const walk = (a: unknown, b: unknown, path: string) => {
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
      const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
      for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) walk(left[key], right[key], path ? `${path}.${key}` : key);
    } else if (Array.isArray(a) && Array.isArray(b)) {
      if (a.every((entry) => entry && typeof entry === "object" && "id" in entry) && b.every((entry) => entry && typeof entry === "object" && "id" in entry)) {
        const orderA = a.map((entry) => entry.id), orderB = b.map((entry) => entry.id);
        if (JSON.stringify(orderA) !== JSON.stringify(orderB)) changes.push({ path: `${path}.order`, before: repr(orderA), after: repr(orderB) });
        const left = new Map(a.map((entry) => [entry.id, entry])), right = new Map(b.map((entry) => [entry.id, entry]));
        for (const key of new Set([...left.keys(), ...right.keys()])) walk(left.get(key), right.get(key), `${path}[${key}]`);
      } else changes.push({ path, before: repr(a), after: repr(b) });
    } else changes.push({ path, before: repr(a), after: repr(b) });
  };
  walk(before, after, "");
  return changes;
}
