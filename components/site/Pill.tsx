import type { ReactNode } from "react";
import type { IconType } from "react-icons";

export function Pill({ icon: Icon, children, className = "mb-6" }: { icon: IconType; children: ReactNode; className?: string }) {
  return <div className={`inline-flex items-center space-x-2 bg-vapor-card/80 border border-vapor-border rounded-full px-4 py-2 ${className}`}><Icon className="text-vapor-pink" aria-hidden="true" /><span className="font-mono text-sm text-gray-400">{children}</span></div>;
}

export function Arrow() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>;
}
