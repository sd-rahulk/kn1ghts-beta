// Class strings shared across pages, copied from the reference design so every form,
// link and card renders identically wherever it appears.
export const LOGO = "/brand/kn1ghts-logo.png";

export const pageLinks = [
  { label: "Home", href: "/" }, { label: "POW", href: "/pow" }, { label: "Team", href: "/team" },
  { label: "Events", href: "/events" }, { label: "Weekly", href: "/inhouse-weekly" }, { label: "Blog", href: "/blog" },
  { label: "Join", href: "/contact" }, { label: "Account", href: "/account" },
];

export const container ="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8";
export const label = "block text-sm font-mono text-brass";
export const input = "cyber-input mt-2";
export const textarea = "cyber-textarea mt-2";
export const primaryButton = "cyber-button";
export const secondaryButton = "px-8 py-3 font-cyber font-semibold text-brass uppercase tracking-wider border-2 border-brass rounded hover:bg-brass/10 transition-all duration-300 text-center disabled:opacity-50";
export const mutedButton = "px-8 py-3 font-cyber font-semibold text-gray-300 uppercase tracking-wider border-2 border-edge rounded hover:border-patina hover:text-patina transition-all duration-300 text-center";
export const textAction = "justify-self-start font-mono text-sm text-gray-400 hover:text-verdigris transition-colors duration-300 disabled:opacity-50";
export const textLink = "inline-flex items-center gap-2 font-mono text-brass hover:text-verdigris transition-colors duration-300";
export const formStatus = "min-h-5 font-mono text-sm text-gray-400 whitespace-pre-wrap";
export const formStatusError = "min-h-5 font-mono text-sm text-brass whitespace-pre-wrap";
export const tag = "px-2 py-1 bg-edge text-gray-400 text-xs font-mono rounded uppercase";
export const card = "cyber-card p-6 group hover:-translate-y-2 transition-all duration-300";

// Accent rotation used for icons and hover states: verdigris, brass, light patina.
export const accents = [
  { text: "text-verdigris", tile: "bg-verdigris/20", hover: "hover:text-verdigris hover:border-verdigris/50" },
  { text: "text-brass", tile: "bg-brass/20", hover: "hover:text-brass hover:border-brass/50" },
  { text: "text-patina", tile: "bg-patina/20", hover: "hover:text-patina hover:border-patina/50" },
] as const;
export const accent = (index: number) => accents[index % accents.length];
