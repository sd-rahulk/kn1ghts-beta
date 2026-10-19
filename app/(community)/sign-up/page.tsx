import Link from "next/link";
import { FaUserPlus } from "react-icons/fa";
import { AuthForm } from "@/components/community/AuthForms";
import { FormLayout, PageLead, SectionTitle } from "@/components/community/CommunityShell";
import { Arrow } from "@/components/site/Pill";
import { textLink } from "@/components/site/ui";

export const metadata = { title: "Create account | KN1GHTS" };
export default function SignUpPage() {
  return <>
    <PageLead meta="CREATE ACCOUNT" title="ENTER THE FIELD." description="Create a public KN1GHTS account with email and password. Your email must be verified before you can comment or submit challenge flags." icon={FaUserPlus} />
    <FormLayout aside={<><SectionTitle glow="Create" rest="account" tone="neon-brass" className="mb-4" /><p className="text-gray-400 leading-relaxed mb-6">Already registered?</p><Link className={textLink} href="/sign-in">SIGN IN<Arrow /></Link></>}>
      <AuthForm mode="sign-up" />
    </FormLayout>
  </>;
}
