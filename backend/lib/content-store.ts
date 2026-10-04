import "server-only";
import { randomUUID } from "node:crypto";
import initial from "../content/default.json";
import { database } from "./firebase-admin";
import { HttpError } from "./http";
import { changeState, ConflictError, normalizeState, type CmsState } from "./revisions";
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
  return normalizeState((await database().ref("cms").get()).val(), defaultContent);
}
export async function commit(options: { content: SiteContent; expectedVersion: number; kind: Revision["kind"]; actor: Actor; note: string; restoreId?: string }) {
  const at = Date.now(), id = `${at}-${randomUUID()}`;
  const cached = await getCms();
  // Recorded by the attempt that aborts; every attempt starts clean so an earlier pass cannot leak in.
  const attempt: { failure?: "conflict" | "missing" | Error } = {};
  const result = await database().ref("cms").transaction((raw) => {
    attempt.failure = undefined;
    try {
      // A null first pass means nothing is cached locally. The server only accepts a write computed from
      // the value it actually holds, so it reruns this with that value whenever `cached` is out of date.
      const current = raw === null ? cached : normalizeState(raw, defaultContent);
      const restored = options.restoreId ? current.revisions[options.restoreId]?.content : options.content;
      if (!restored) { attempt.failure = "missing"; return undefined; }
      return changeState(current, { ...options, content: restored, id, at });
    } catch (error) {
      // Never throw from the update function: the SDK reruns it while handling a server response,
      // where an exception escapes the transaction and leaves this request waiting.
      attempt.failure = error instanceof ConflictError ? "conflict" : error instanceof Error ? error : new Error("The update could not be prepared.");
      return undefined;
    }
  });
  const { failure } = attempt;
  if (failure instanceof Error) throw failure;
  if (!result.committed) throw new HttpError(failure === "missing" ? 404 : 409, failure === "missing" ? "That revision is unavailable." : failure === "conflict" ? "Someone else updated the content. Reload before saving." : "The update could not be committed.");
  return { version: result.snapshot.child("version").val() as number, revisionId: id };
}
export async function history(limit = 30, before?: string) {
  let query = database().ref("cms/revisions").orderByKey();
  if (before) query = query.endBefore(before);
  const value = (await query.limitToLast(limit).get()).val() as Record<string, Revision> | null;
  return Object.values(value ?? {}).sort((a, b) => b.at - a.at).slice(0, limit).map(({ content: _content, ...entry }) => { void _content; return { ...entry, changes: entry.changes ?? [] }; });
}
