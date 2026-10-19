import { FaUserShield } from "react-icons/fa";
import { JoinForm } from "@/components/community/JoinForm";
import { FormLayout, PageLead, SectionTitle } from "@/components/community/CommunityShell";

export const metadata = { title: "Join | KN1GHTS" };
export default function ContactPage() {
  return <>
    <PageLead meta="JOIN" title="JOIN THE COLLECTIVE." description="Tell us what you work on, how you learn and where we can see your work. Applications arrive in the private KN1GHTS management inbox." icon={FaUserShield} />
    <FormLayout aside={<><SectionTitle glow="Send an" rest="application" tone="neon-cyan" className="mb-4" /><p className="text-gray-400 leading-relaxed">For collaborations or event invitations, use the general contact form on the main landing page.</p></>}>
      <JoinForm />
    </FormLayout>
  </>;
}
