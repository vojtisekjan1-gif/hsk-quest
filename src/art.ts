// Hand-drawn style SVG art, written in code. Each function returns a string
// of SVG markup that main.ts places into the page.

import type { ItemId } from "./adventure";
import { monsterById } from "./world";

const INK = "#1f1d1a";

// The drawing inside each monster's 120 × 120 frame, by monster id.
const MONSTER_ART: Record<string, string> = {
  slime: `
    <ellipse cx="60" cy="82" rx="42" ry="28" fill="#6cc46a" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="60" cy="72" rx="30" ry="18" fill="#8bdc88" opacity="0.6"/>
    <circle cx="46" cy="76" r="5" fill="${INK}"/>
    <circle cx="74" cy="76" r="5" fill="${INK}"/>
    <path d="M50 90 Q60 96 70 90" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  wolf: `
    <path d="M30 60 L40 20 L58 50 Z" fill="#8a8f99" stroke="${INK}" stroke-width="3"/>
    <path d="M90 60 L80 20 L62 50 Z" fill="#8a8f99" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="60" cy="72" rx="36" ry="30" fill="#a9afba" stroke="${INK}" stroke-width="3"/>
    <circle cx="46" cy="66" r="5" fill="${INK}"/>
    <circle cx="74" cy="66" r="5" fill="${INK}"/>
    <path d="M52 86 L60 92 L68 86" fill="#fff" stroke="${INK}" stroke-width="2"/>`,
  // A folded paper tiger: flat shapes with crease lines.
  tiger: `
    <path d="M28 44 L38 22 L50 40 Z" fill="#f2a541" stroke="${INK}" stroke-width="3"/>
    <path d="M92 44 L82 22 L70 40 Z" fill="#f2a541" stroke="${INK}" stroke-width="3"/>
    <path d="M24 50 L60 34 L96 50 L88 92 L60 104 L32 92 Z" fill="#f7c873" stroke="${INK}" stroke-width="3"/>
    <path d="M60 34 V104" stroke="${INK}" stroke-width="1" opacity="0.4"/>
    <path d="M36 56 L46 60 M84 56 L74 60 M34 72 L44 72 M86 72 L76 72" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <path d="M44 66 L52 62 M76 66 L68 62" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <path d="M50 86 L60 80 L70 86" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M54 50 H66" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  fox: `
    <path d="M32 52 L36 18 L56 44 Z" fill="#e8823a" stroke="${INK}" stroke-width="3"/>
    <path d="M88 52 L84 18 L64 44 Z" fill="#e8823a" stroke="${INK}" stroke-width="3"/>
    <path d="M26 50 Q60 34 94 50 L60 100 Z" fill="#f09a50" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M42 70 Q60 64 78 70 L60 100 Z" fill="#fff4e6"/>
    <path d="M44 60 Q48 56 52 60" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <path d="M68 60 Q72 56 76 60" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="60" cy="94" r="4" fill="${INK}"/>
    <circle cx="20" cy="30" r="5" fill="#9fd3f2" opacity="0.7"/>
    <circle cx="100" cy="26" r="4" fill="#9fd3f2" opacity="0.7"/>`,
  turtle: `
    <ellipse cx="60" cy="96" rx="44" ry="8" fill="${INK}" opacity="0.15"/>
    <circle cx="100" cy="76" r="12" fill="#9cb87a" stroke="${INK}" stroke-width="3"/>
    <circle cx="104" cy="73" r="2.5" fill="${INK}"/>
    <path d="M18 90 Q20 40 60 38 Q100 40 102 90 Z" fill="#8d8a80" stroke="${INK}" stroke-width="3"/>
    <path d="M60 38 V90 M38 46 L46 90 M82 46 L74 90 M22 66 H98" stroke="${INK}" stroke-width="2" opacity="0.5"/>
    <rect x="26" y="88" width="14" height="10" rx="3" fill="#9cb87a" stroke="${INK}" stroke-width="2"/>
    <rect x="80" y="88" width="14" height="10" rx="3" fill="#9cb87a" stroke="${INK}" stroke-width="2"/>`,
  // The Nian beast of New Year stories: red, horned, with a big grin.
  nian: `
    <path d="M36 40 Q28 18 40 12 Q38 28 48 36 Z" fill="#f5c542" stroke="${INK}" stroke-width="3"/>
    <path d="M84 40 Q92 18 80 12 Q82 28 72 36 Z" fill="#f5c542" stroke="${INK}" stroke-width="3"/>
    <path d="M18 70 Q14 40 40 34 Q60 26 80 34 Q106 40 102 70 Q100 104 60 106 Q20 104 18 70 Z" fill="#c9302c" stroke="${INK}" stroke-width="3"/>
    <circle cx="44" cy="56" r="9" fill="#fff" stroke="${INK}" stroke-width="2"/>
    <circle cx="76" cy="56" r="9" fill="#fff" stroke="${INK}" stroke-width="2"/>
    <circle cx="46" cy="58" r="4" fill="${INK}"/>
    <circle cx="74" cy="58" r="4" fill="${INK}"/>
    <path d="M32 78 Q60 100 88 78 Z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M44 82 L48 90 L52 84 L58 92 L62 84 L68 90 L72 82 L76 88" fill="none" stroke="${INK}" stroke-width="2"/>`,
  crane: `
    <path d="M60 64 L14 46 Q30 70 56 76 Z" fill="#f3f3f0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M14 46 L24 58" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="66" cy="74" rx="22" ry="14" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <path d="M78 66 Q90 44 82 26" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="82" cy="24" r="8" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <circle cx="82" cy="18" r="3.5" fill="#d9534f"/>
    <circle cx="84" cy="24" r="2" fill="${INK}"/>
    <path d="M89 25 L106 30 L89 28 Z" fill="#c9a24a" stroke="${INK}" stroke-width="1.5"/>
    <path d="M60 88 V110 M70 88 V110" stroke="${INK}" stroke-width="3"/>
    <text x="22" y="30" font-size="16" font-weight="bold" fill="${INK}">?</text>`,
  // A bat made of an ink blot, with drips.
  bat: `
    <path d="M60 54 Q40 30 10 40 Q22 50 18 64 Q30 58 36 70 Q44 60 60 72 Q76 60 84 70 Q90 58 102 64 Q98 50 110 40 Q80 30 60 54 Z" fill="#2f3542" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <ellipse cx="60" cy="66" rx="14" ry="16" fill="#3d4454" stroke="${INK}" stroke-width="3"/>
    <path d="M50 52 L52 42 L56 52 M64 52 L68 42 L70 52" fill="#3d4454" stroke="${INK}" stroke-width="2"/>
    <circle cx="54" cy="62" r="3" fill="#f5c542"/>
    <circle cx="66" cy="62" r="3" fill="#f5c542"/>
    <path d="M56 72 L58 76 L60 72 L62 76 L64 72" fill="none" stroke="#fff" stroke-width="1.5"/>
    <path d="M40 72 Q42 86 40 92 M82 72 Q80 84 82 96" fill="none" stroke="#2f3542" stroke-width="4" stroke-linecap="round"/>`,
  dragon: `
    <path d="M60 60 L8 36 L20 70 Z" fill="#d9534f" stroke="${INK}" stroke-width="3"/>
    <path d="M60 60 L112 36 L100 70 Z" fill="#d9534f" stroke="${INK}" stroke-width="3"/>
    <circle cx="60" cy="72" r="32" fill="#e8745f" stroke="${INK}" stroke-width="3"/>
    <circle cx="48" cy="66" r="5" fill="${INK}"/>
    <circle cx="72" cy="66" r="5" fill="${INK}"/>
    <path d="M50 84 Q60 92 70 84" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <path d="M56 40 L60 28 L64 40" fill="#f5c542" stroke="${INK}" stroke-width="2"/>`,
  // A terracotta warrior: clay-colored, with a topknot and armor plates.
  guard: `
    <circle cx="60" cy="16" r="7" fill="#b5653a" stroke="${INK}" stroke-width="3"/>
    <circle cx="60" cy="36" r="16" fill="#c9784a" stroke="${INK}" stroke-width="3"/>
    <path d="M52 34 H56 M64 34 H68" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <path d="M54 44 H66" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <path d="M32 112 L36 58 Q60 48 84 58 L88 112 Z" fill="#b5653a" stroke="${INK}" stroke-width="3"/>
    <path d="M40 68 H80 M39 78 H81 M38 88 H82" stroke="${INK}" stroke-width="2" opacity="0.6"/>
    <path d="M48 60 V96 M60 58 V96 M72 60 V96" stroke="${INK}" stroke-width="1.5" opacity="0.4"/>
    <path d="M96 30 V112" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <path d="M90 34 L96 18 L102 34 Z" fill="#a9afba" stroke="${INK}" stroke-width="2"/>`,
  mirror: `
    <ellipse cx="60" cy="58" rx="34" ry="42" fill="#c9a24a" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="60" cy="58" rx="26" ry="34" fill="#dff1f7" stroke="${INK}" stroke-width="2"/>
    <path d="M44 38 L52 30 M46 50 L62 34" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    <circle cx="51" cy="60" r="4" fill="${INK}"/>
    <circle cx="69" cy="60" r="4" fill="${INK}"/>
    <path d="M52 74 Q60 68 68 74" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <rect x="52" y="98" width="16" height="16" rx="3" fill="#8a6d3b" stroke="${INK}" stroke-width="3"/>`,
  // A shadowy emperor: dark robe, a mianguan crown with bead strings, glowing eyes.
  emperor: `
    <path d="M22 114 Q26 60 60 56 Q94 60 98 114 Z" fill="#3a2f5b" stroke="${INK}" stroke-width="3"/>
    <path d="M60 60 V114" stroke="#f5c542" stroke-width="3"/>
    <circle cx="60" cy="44" r="20" fill="#4a3f6b" stroke="${INK}" stroke-width="3"/>
    <rect x="30" y="18" width="60" height="8" fill="#1f1d1a" stroke="${INK}" stroke-width="2"/>
    <path d="M36 26 V40 M44 26 V38 M76 26 V38 M84 26 V40" stroke="#f5c542" stroke-width="2" stroke-dasharray="3 2"/>
    <circle cx="52" cy="46" r="3.5" fill="#f5c542"/>
    <circle cx="68" cy="46" r="3.5" fill="#f5c542"/>
    <path d="M52 56 H68" stroke="${INK}" stroke-width="2"/>`,
};

export function monsterSvg(id: string): string {
  const art = MONSTER_ART[id];
  if (!art) return "";
  const name = monsterById(id)?.name ?? "Monster";
  return `<svg viewBox="0 0 120 120" role="img" aria-label="${name}">${art}</svg>`;
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

// A small coin with a square hole, like an old Chinese cash coin. Decorative:
// the text next to it always says "gold".
export function coinSvg(): string {
  return `<svg viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="15" fill="#f5c542" stroke="${INK}" stroke-width="2"/>
    <rect x="15" y="15" width="10" height="10" fill="#fff8e1" stroke="${INK}" stroke-width="2"/>
  </svg>`;
}

// Map icons for the regions, by region id. Decorative: the region name is shown as text.
const REGION_ART: Record<string, string> = {
  village: `
    <path d="M6 22 L20 10 L34 22 Z" fill="#c9302c" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <rect x="10" y="22" width="20" height="12" fill="#f1e4c8" stroke="${INK}" stroke-width="2"/>
    <rect x="17" y="26" width="6" height="8" fill="#8a6d3b"/>`,
  forest: `
    <path d="M12 34 L4 34 L12 8 L20 34 Z" fill="#4f9a5a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M28 34 L18 34 L28 4 L38 34 Z" fill="#3e8550" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M2 24 Q20 18 38 24" fill="none" stroke="#dfe6ea" stroke-width="3" opacity="0.8"/>`,
  mountains: `
    <path d="M2 34 L14 12 L22 24 L28 14 L38 34 Z" fill="#5fa88a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M14 12 L10 19 L18 19 Z" fill="#fff"/>`,
  palace: `
    <path d="M4 16 Q20 6 36 16 Z" fill="#c9302c" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <rect x="8" y="16" width="24" height="18" fill="#f5c542" stroke="${INK}" stroke-width="2"/>
    <path d="M14 16 V34 M26 16 V34" stroke="#c9302c" stroke-width="3"/>
    <rect x="17" y="24" width="6" height="10" fill="#8a6d3b"/>`,
};

export function regionSvg(id: string): string {
  const art = REGION_ART[id];
  return art ? `<svg viewBox="0 0 40 40" aria-hidden="true">${art}</svg>` : "";
}
