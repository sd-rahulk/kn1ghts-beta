import "server-only";
import { randomUUID } from "node:crypto";
import initial from "../content/default.json";
import { database } from "./firebase-admin";
import { HttpError } from "./http";
import { changeState, ConflictError, type CmsState } from "./revisions";
import { siteSchema, type Actor, type Revision, type SiteContent } from "./schema";

export const defaultContent = () => siteSchema.parse(initial);
// Routine editor/preview reads do not download every historical snapshot.
// Compare versions around the reads so a concurrent publish cannot mix states.
export async function getDraft() {
  const cms = database().ref("cms");
  for (let attempt = 0; attempt < 3; attempt++) {
    const before = (await cms.child("version").get()).val() ?? 0;
    const [draft, publishedAt] = await Promise.all([cms.child("draft").get(), cms.child("publishedAt").get()]);
    const after = (await cms.child("version").get()).val() ?? 0;
    if (before === after) return { version: after as number, draft: draft.exists() ? siteSchema.parse(draft.val()) : defaultContent(), publishedAt: publishedAt.val() as number | null };
  }
  throw new HttpError(409, "Content is being updated. Please reload in a moment.");
}
export async function getCms(): Promise<CmsState> {
  const value = (await database().ref("cms").get()).val();
  if (!value) return { version: 0, draft: defaultContent(), published: null, publishedAt: null, revisions: {} };
  return { ...value, version: value.version ?? 0, draft: siteSchema.parse(value.draft), published: value.published ? siteSchema.parse(value.published) : null, publishedAt: value.publishedAt ?? null, revisions: value.revisions ?? {} };
}
export async function commit(options: { content: SiteContent; expectedVersion: number; kind: Revision["kind"]; actor: Actor; note: string; restoreId?: string }) {
  const at = Date.now(), id = `${at}-${randomUUID()}`;
  const cached = await getCms();
  let conflict = false, missing = false;
  const result = await database().ref("cms").transaction((raw) => {
    const current: CmsState = raw ?? cached;
    const restored = options.restoreId ? current.revisions?.[options.restoreId]?.content : options.content;
    if (!restored) { missing = true; return undefined; }
    try { return changeState(current, { ...options, content: restored, id, at }); }
    catch (error) { if (error instanceof ConflictError) { conflict = true; return undefined; } throw error; }
  });
  if (!result.committed) throw new HttpError(missing ? 404 : 409, missing ? "That revision is unavailable." : conflict ? "Someone else updated the content. Reload before saving." : "The update could not be committed.");
  return { version: result.snapshot.child("version").val() as number, revisionId: id };
}
export async function history(limit = 30, before?: string) {
  let query = database().ref("cms/revisions").orderByKey();
  if (before) query = query.endBefore(before);
  const value = (await query.limitToLast(limit).get()).val() as Record<string, Revision> | null;
  return Object.values(value ?? {}).sort((a, b) => b.at - a.at).slice(0, limit).map(({ content: _content, ...entry }) => { void _content; return { ...entry, changes: entry.changes ?? [] }; });
}
