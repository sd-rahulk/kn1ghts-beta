export function Wordmark({ name, mark, className = "" }: { name: string; mark: string; className?: string }) {
  return <span className={`font-cyber font-black tracking-wider gradient-text ${className}`}>{name}{mark && <sup className="ml-0.5 text-[0.4em] text-vapor-cyan">{mark}</sup>}</span>;
}
