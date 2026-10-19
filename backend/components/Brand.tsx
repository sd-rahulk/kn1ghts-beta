import Image from "next/image";

// The KN1GHTS logo and wordmark with the workspace label, as on the public site.
export function BrandMark() {
  return <><Image src="/brand/kn1ghts-logo.png" alt="" width={36} height={34} priority /><span>KN1GHTS<small>/ MANAGEMENT</small></span></>;
}
