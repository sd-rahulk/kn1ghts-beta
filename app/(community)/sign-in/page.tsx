import Link from "next/link";
import { FaSignInAlt } from "react-icons/fa";
import { AuthForm } from "@/components/community/AuthForms";
import { FormLayout, PageLead, SectionTitle } from "@/components/community/CommunityShell";
import { Arrow } from "@/components/site/Pill";
import { textLink } from "@/components/site/ui";

export const metadata = { title: "Sign in | KN1GHTS" };
export default function SignInPage() {
  return <>
    <PageLead meta="SIGN IN" title="RETURN TO THE ARENA." description="Sign in with your verified email to submit weekly challenge flags and join moderated blog discussions." icon={FaSignInAlt} />
    <FormLayout aside={<><SectionTitle glow="Sign" rest="in" tone="neon-steel" className="mb-4" /><p className="text-gray-400 leading-relaxed mb-6">New here?</p><Link className={textLink} href="/sign-up">CREATE AN ACCOUNT<Arrow /></Link></>}>
      <AuthForm mode="sign-in" />
    </FormLayout>
  </>;
}
