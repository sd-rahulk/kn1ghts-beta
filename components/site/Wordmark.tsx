import Image from "next/image";
import { LOGO } from "./ui";

export function Wordmark({ name, mark, className = "" }: { name: string; mark: string; className?: string }) {
  return <span className={`font-cyber font-black tracking-wider gradient-text ${className}`}>{name}{mark && <sup className="ml-0.5 text-[0.4em] text-vapor-cyan">{mark}</sup>}</span>;
}

// Logo crest beside the wordmark, as used in the navigation and footer.
export function Brand({ name, mark, size, text }: { name: string; mark: string; size: string; text: string }) {
  return <span className="flex items-center gap-3">
    <span className={`relative shrink-0 ${size}`}><Image src={LOGO} alt="" fill sizes="64px" className="object-contain" /></span>
    <Wordmark name={name} mark={mark} className={text} />
  </span>;
}
