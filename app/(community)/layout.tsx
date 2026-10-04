import "../community.css";
import { CommunityShell } from "@/components/community/CommunityShell";
import { getSiteContent } from "@/lib/site-content";

export default async function Layout({ children }: { children: React.ReactNode }) { return <CommunityShell settings={(await getSiteContent()).settings}>{children}</CommunityShell>; }
