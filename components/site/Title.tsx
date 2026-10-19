import { Fragment } from "react";

// CMS titles mark their emphasis as [[text]] and break lines with \n. The reference design sets
// headings on one line: emphasised words glow, the rest is white. A title without emphasis uses
// the animated gradient instead.
export function Title({ value, glow = "neon-steel" }: { value: string; glow?: "neon-steel" | "neon-ember" | "neon-gold" }) {
  const text = value.replace(/\s*\n\s*/g, " ");
  if (!text.includes("[[")) return <span className="gradient-text">{text}</span>;
  return text.split(/(\[\[[\s\S]*?\]\])/).filter(Boolean).map((part, index) => part.startsWith("[[")
    ? <span key={index} className={glow}>{part.slice(2, -2)}</span>
    : <span key={index} className="text-white">{part}</span>);
}

// Two-tone page heading: leading words in white, the final word in the gradient.
export function SplitTitle({ value }: { value: string }) {
  const words = value.trim().split(/\s+/);
  const last = words.pop() ?? "";
  return <>{words.length > 0 && <><span className="text-white">{words.join(" ")}</span>{" "}</>}<span className="gradient-text">{last}</span></>;
}

// Plain text with line breaks preserved and [[emphasis]] markers removed.
export function Plain({ value }: { value: string }) {
  return value.replace(/\[\[|\]\]/g, "").split("\n").map((line, index) => <Fragment key={index}>{index > 0 && <br />}{line}</Fragment>);
}
