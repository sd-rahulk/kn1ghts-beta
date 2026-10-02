import { diffContent, siteSchema, type Actor, type Revision, type SiteContent } from "./schema";

export type CmsState = { version: number; draft: SiteContent; published: SiteContent | null; publishedAt: number | null; revisions: Record<string, Revision> };
export class ConflictError extends Error {}
export function changeState(current: CmsState, options: { expectedVersion: number; kind: Revision["kind"]; content: SiteContent; actor: Actor; note: string; id: string; at: number }): CmsState {
  if (current.version !== options.expectedVersion) throw new ConflictError("Someone else updated the content. Reload the latest version before saving.");
  const content = siteSchema.parse(options.content);
  const revision: Revision = {
    id: options.id, kind: options.kind, at: options.at, actor: options.actor, note: options.note,
    version: current.version + 1,
    changes: diffContent(options.kind === "publish" ? current.published : current.draft, content), content,
  };
  return {
    ...current, version: revision.version, draft: content,
    ...(options.kind === "publish" ? { published: content, publishedAt: options.at } : {}),
    revisions: { ...(current.revisions ?? {}), [revision.id]: revision },
  };
}
