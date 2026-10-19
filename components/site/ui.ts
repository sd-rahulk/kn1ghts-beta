// Class strings shared across pages, copied from the reference design so every form,
// link and card renders identically wherever it appears.
export const LOGO = "/brand/kn1ghts-logo.png";

export const pageLinks = [
  { label: "Home", href: "/" }, { label: "POW", href: "/pow" }, { label: "Team", href: "/team" },
  { label: "Events", href: "/events" }, { label: "Weekly", href: "/inhouse-weekly" }, { label: "Blog", href: "/blog" },
  { label: "Join", href: "/contact" }, { label: "Account", href: "/account" },
];

export const container ="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8";
export const label = "block text-sm font-mono text-vapor-cyan";
export const input = "cyber-input mt-2";
export const textarea = "cyber-textarea mt-2";
export const primaryButton = "cyber-button";
export const secondaryButton = "px-8 py-3 font-cyber font-semibold text-vapor-cyan uppercase tracking-wider border-2 border-vapor-cyan rounded hover:bg-vapor-cyan/10 transition-all duration-300 text-center disabled:opacity-50";
export const mutedButton = "px-8 py-3 font-cyber font-semibold text-gray-300 uppercase tracking-wider border-2 border-vapor-border rounded hover:border-vapor-purple hover:text-vapor-purple transition-all duration-300 text-center";
export const textAction = "justify-self-start font-mono text-sm text-gray-400 hover:text-vapor-pink transition-colors duration-300 disabled:opacity-50";
export const textLink = "inline-flex items-center gap-2 font-mono text-vapor-cyan hover:text-vapor-pink transition-colors duration-300";
export const formStatus = "min-h-5 font-mono text-sm text-gray-400 whitespace-pre-wrap";
export const formStatusError = "min-h-5 font-mono text-sm text-vapor-pink whitespace-pre-wrap";
export const tag = "px-2 py-1 bg-vapor-border text-gray-400 text-xs font-mono rounded uppercase";
export const card = "cyber-card p-6 group hover:-translate-y-2 transition-all duration-300";

// Accent rotation used for icons and headings, in the reference order.
export const accents = [
  { text: "text-vapor-pink", tile: "bg-vapor-pink/20", hover: "hover:text-vapor-pink hover:border-vapor-pink/50" },
  { text: "text-vapor-cyan", tile: "bg-vapor-cyan/20", hover: "hover:text-vapor-cyan hover:border-vapor-cyan/50" },
  { text: "text-vapor-purple", tile: "bg-vapor-purple/20", hover: "hover:text-vapor-purple hover:border-vapor-purple/50" },
  { text: "text-vapor-mint", tile: "bg-vapor-mint/20", hover: "hover:text-vapor-mint hover:border-vapor-mint/50" },
] as const;
export const accent = (index: number) => accents[index % accents.length];
