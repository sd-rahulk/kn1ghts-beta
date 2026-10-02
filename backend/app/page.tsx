import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth";
import { getDraft } from "@/lib/content-store";
import { Dashboard } from "@/components/Dashboard";

export const dynamic = "force-dynamic";
export default async function Home() {
  const actor = await getActor();
  if (!actor) redirect("/login");
  const { draft, version, publishedAt } = await getDraft();
  return <Dashboard actor={actor} initial={draft} initialVersion={version} initialPublishedAt={publishedAt} />;
}
