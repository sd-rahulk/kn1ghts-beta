import { FaIdBadge } from "react-icons/fa";
import { AccountActivity } from "@/components/community/AccountActivity";
import { AccountPanel } from "@/components/community/AccountPanel";
import { FormLayout, PageBody, PageLead, SectionTitle } from "@/components/community/CommunityShell";

export const metadata = { title: "Account | KN1GHTS" };
export default function AccountPage() {
  return <>
    <PageLead meta="PUBLIC IDENTITY" title="ACCOUNT" description="Manage the handle displayed beside your solves and approved comments." icon={FaIdBadge} />
    <FormLayout aside={<><SectionTitle glow="Your" rest="profile" tone="neon-steel" className="mb-4" /><p className="text-gray-400 leading-relaxed">Your email stays private. Only your public handle and solve times appear on community pages.</p></>}>
      <AccountPanel />
    </FormLayout>
    <PageBody narrow alt><AccountActivity /></PageBody>
  </>;
}
