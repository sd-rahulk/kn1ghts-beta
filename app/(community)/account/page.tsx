import { AccountActivity } from "@/components/community/AccountActivity";
import { AccountPanel } from "@/components/community/AccountPanel";
import { PageLead } from "@/components/community/CommunityShell";

export const metadata = { title: "Account | KN1GHTS" };
export default function AccountPage() { return <main className="community-page"><PageLead meta="PUBLIC IDENTITY" title="ACCOUNT" description="Manage the handle displayed beside your solves and approved comments." /><div className="auth-layout"><div><p className="community-empty">Your email stays private. Only your public handle and solve times appear on community pages.</p></div><AccountPanel /></div><AccountActivity /></main>; }
