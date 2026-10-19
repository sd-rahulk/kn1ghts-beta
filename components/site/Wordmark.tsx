import Image from "next/image";
import { LOGO } from "./ui";

export function Wordmark({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`font-cyber font-black tracking-wider gradient-text ${className}`}>{name}</span>;
}

// Logo crest beside the wordmark, as used in the navigation and footer.
export function Brand({ name, size, text }: { name: string; size: string; text: string }) {
  return <span className="flex items-center gap-3">
    <span className={`logo-halo relative shrink-0 ${size}`}><Image src={LOGO} alt="" fill sizes="64px" className="object-contain" /></span>
    <Wordmark name={name} className={text} />
  </span>;
}
