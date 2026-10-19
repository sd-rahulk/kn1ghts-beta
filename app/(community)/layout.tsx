import { CommunityShell } from "@/components/community/CommunityShell";
import { getSiteContent } from "@/lib/site-content";

export default async function Layout({ children }: { children: React.ReactNode }) { return <CommunityShell site={await getSiteContent()}>{children}</CommunityShell>; }
