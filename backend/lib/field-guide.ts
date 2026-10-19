import type { SiteSection } from "./schema";

// Where each editable value appears on the public site, and which stored values the current
// design no longer displays. Hidden values stay in the content (the schema still requires them,
// and published content must keep validating); the editor simply stops offering them.

export const hiddenSettings = new Set(["registrationMark"]);
export const settingHints: Record<string, string> = {
  name: "Shown beside the logo in the navigation and footer.",
  headerLine: "Small line in the footer's bottom-right corner.",
  title: "Browser tab and search result title.",
  publicUrl: "The public website's address.",
  copyright: "Footer, bottom-left.",
};

export const hiddenLabels = new Set(["skipIntro", "entering", "openMenu", "closeMenu", "backToTop"]);
export const labelHints: Record<string, string> = {
  skipContent: "Keyboard \"skip to content\" link at the top of every page.",
  fieldReport: "Shown in place of a date on cards that have none.",
  profile: "Link text on team member cards.",
};

export const hiddenSectionFields: Partial<Record<SiteSection["type"], ReadonlySet<string>>> = {
  hero: new Set(["metaLeft", "metaRight"]),
  updates: new Set(["feedLabel", "feedStatus"]),
  recruitment: new Set(["mark"]),
};

const empty = { emptyLabel: "Small label in the empty-state card, shown while there are no items.", emptyTitle: "Heading of the empty-state card.", emptyDescription: "Text of the empty-state card." };
export const sectionFieldHints: Partial<Record<SiteSection["type"], Record<string, string>>> = {
  hero: {
    tagline: "Pill under the hero description.",
    mindset: "Line above the numbered steps.",
    path: "One step per line; each becomes a numbered box.",
    ctaLabel: "Main (filled) button.", ctaHref: "Main button destination.",
    scrollLabel: "Outline button and the scroll indicator.", scrollHref: "Outline button and scroll indicator destination.",
  },
  updates: { linkLabel: "Link text on each update card." },
  about: { secondHeading: "Second heading under the first; [[brackets]] glow.", rail: "One line per row in the card beside the text." },
  results: { sourceLabel: "Link text under each result card." },
  writeups: { ...empty, itemLabel: "Label on writeup cards that have none of their own." },
  projects: { ...empty, emptyHref: "Button in the empty-state card (for example your GitHub organisation)." },
  team: { itemLabel: "Label above each member's name, followed by their number." },
  journal: { ...empty, itemLabel: "Label on journal cards that have none of their own." },
  recruitment: { ctaLabel: "Button text.", ctaHref: "Button destination." },
  finale: { tagline: "Large gradient line in the closing card.", ctaLabel: "Button text.", ctaHref: "Button destination." },
  content: { ctaLabel: "Button under the cards (leave empty to hide).", ctaHref: "Button destination." },
};
