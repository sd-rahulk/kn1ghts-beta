import { diffContent, siteSchema, type Actor, type Revision, type SiteContent } from "./schema";

export type CmsState = { version: number; draft: SiteContent; published: SiteContent | null; publishedAt: number | null; revisions: Record<string, Revision> };
export class ConflictError extends Error {}
// Realtime Database drops empty arrays and maps, so a stored value lacks keys such as `items: []`.
// Parse stored content with the schema before comparing it, or every save records "(missing) → []".
export function normalizeState(raw: unknown, fallback: () => SiteContent): CmsState {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<CmsState>;
  return {
    ...value,
    version: typeof value.version === "number" ? value.version : 0,
    draft: value.draft ? siteSchema.parse(value.draft) : fallback(),
    published: value.published ? siteSchema.parse(value.published) : null,
    publishedAt: value.publishedAt ?? null,
    revisions: value.revisions ?? {},
  };
}
export function changeState(current: CmsState, options: { expectedVersion: number; kind: Revision["kind"]; content: SiteContent; actor: Actor; note: string; id: string; at: number }): CmsState {
  if (current.version !== options.expectedVersion) throw new ConflictError("Someone else updated the content. Reload the latest version before saving.");
  const content = siteSchema.parse(options.content);
  const baseline = options.kind === "publish" ? current.published : current.draft;
  const revision: Revision = {
    id: options.id, kind: options.kind, at: options.at, actor: options.actor, note: options.note,
    version: current.version + 1,
    changes: diffContent(baseline ? siteSchema.parse(baseline) : baseline, content), content,
  };
  return {
    ...current, version: revision.version, draft: content,
    ...(options.kind === "publish" ? { published: content, publishedAt: options.at } : {}),
    revisions: { ...(current.revisions ?? {}), [revision.id]: revision },
  };
}
