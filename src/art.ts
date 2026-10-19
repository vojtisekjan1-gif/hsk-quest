// Hand-drawn style SVG art, written in code. Each function returns a string
// of SVG markup that main.ts places into the page.

import type { ItemId } from "./adventure";

const INK = "#1f1d1a";

export function monsterSvg(id: string): string {
  switch (id) {
    case "slime":
      return `<svg viewBox="0 0 120 120" role="img" aria-label="Pinyin Slime">
        <ellipse cx="60" cy="82" rx="42" ry="28" fill="#6cc46a" stroke="${INK}" stroke-width="3"/>
        <ellipse cx="60" cy="72" rx="30" ry="18" fill="#8bdc88" opacity="0.6"/>
        <circle cx="46" cy="76" r="5" fill="${INK}"/>
        <circle cx="74" cy="76" r="5" fill="${INK}"/>
        <path d="M50 90 Q60 96 70 90" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      </svg>`;
    case "wolf":
      return `<svg viewBox="0 0 120 120" role="img" aria-label="Tone Wolf">
        <path d="M30 60 L40 20 L58 50 Z" fill="#8a8f99" stroke="${INK}" stroke-width="3"/>
        <path d="M90 60 L80 20 L62 50 Z" fill="#8a8f99" stroke="${INK}" stroke-width="3"/>
        <ellipse cx="60" cy="72" rx="36" ry="30" fill="#a9afba" stroke="${INK}" stroke-width="3"/>
        <circle cx="46" cy="66" r="5" fill="${INK}"/>
        <circle cx="74" cy="66" r="5" fill="${INK}"/>
        <path d="M52 86 L60 92 L68 86" fill="#fff" stroke="${INK}" stroke-width="2"/>
      </svg>`;
    case "dragon":
      return `<svg viewBox="0 0 120 120" role="img" aria-label="Character Dragon">
        <path d="M60 60 L8 36 L20 70 Z" fill="#d9534f" stroke="${INK}" stroke-width="3"/>
        <path d="M60 60 L112 36 L100 70 Z" fill="#d9534f" stroke="${INK}" stroke-width="3"/>
        <circle cx="60" cy="72" r="32" fill="#e8745f" stroke="${INK}" stroke-width="3"/>
        <circle cx="48" cy="66" r="5" fill="${INK}"/>
        <circle cx="72" cy="66" r="5" fill="${INK}"/>
        <path d="M50 84 Q60 92 70 84" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
        <path d="M56 40 L60 28 L64 40" fill="#f5c542" stroke="${INK}" stroke-width="2"/>
      </svg>`;
    default:
      return "";
  }
}

export function heroSvg(): string {
  return `<svg viewBox="0 0 120 120" role="img" aria-label="Hero">
    <path d="M30 110 Q60 58 90 110 Z" fill="#3f6fb5" stroke="${INK}" stroke-width="3"/>
    <circle cx="60" cy="46" r="20" fill="#f1c59a" stroke="${INK}" stroke-width="3"/>
    <path d="M40 40 Q60 16 80 40 Z" fill="#7a4b2a" stroke="${INK}" stroke-width="3"/>
    <circle cx="53" cy="48" r="2.5" fill="${INK}"/>
    <circle cx="67" cy="48" r="2.5" fill="${INK}"/>
  </svg>`;
}

export function itemSvg(id: ItemId): string {
  switch (id) {
    case "potion":
      return `<svg viewBox="0 0 40 40" role="img" aria-label="Potion">
        <path d="M16 6 H24 V12 L30 22 V34 H10 V22 L16 12 Z" fill="#ff6b7a" stroke="${INK}" stroke-width="2"/>
        <rect x="16" y="3" width="8" height="4" fill="#8a6d3b" stroke="${INK}" stroke-width="1.5"/>
      </svg>`;
    case "hint":
      return `<svg viewBox="0 0 40 40" role="img" aria-label="Hint">
        <circle cx="20" cy="16" r="10" fill="#f5c542" stroke="${INK}" stroke-width="2"/>
        <rect x="16" y="26" width="8" height="6" fill="#b0a68a" stroke="${INK}" stroke-width="2"/>
      </svg>`;
    case "shield":
      return `<svg viewBox="0 0 40 40" role="img" aria-label="Shield">
        <path d="M20 4 L34 9 V20 Q34 32 20 37 Q6 32 6 20 V9 Z" fill="#5a8fd6" stroke="${INK}" stroke-width="2"/>
        <path d="M20 12 V30" stroke="#fff" stroke-width="2"/>
      </svg>`;
  }
}
