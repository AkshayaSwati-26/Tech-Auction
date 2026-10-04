# TECH AUCTION — Style Guide

Theme: **Midnight Glass, space edition**. Deep violet space, a starfield, a glowing planet horizon,
a neon light ribbon, wide chrome lettering and violet glass cards. One focal point per screen.

Only the visual layer lives here. Backend logic, API, socket events and auction rules are untouched.

## 1. Tokens

CSS variables in `client/src/styles/index.css`, mirrored in `client/tailwind.config.js`.

| Token | Value | Use |
|---|---|---|
| `--bg` / `midnight`, `void` | `#05030D` | Background |
| `--panel` / `panel` | `#0E0B1C` | Flat admin panels |
| `--glow` | `#1B0F3D` at 40% | The one drifting background glow |
| `--text` / `ink`, `paper` | `#F8F5FF` | Primary text |
| `--secondary` / `slate-muted` | `#B9AEDB` | Labels, body, secondary text |
| `--muted` / `faint` | `#7F76A3` | Decorative only (too low-contrast for reading text) |
| `--violet` → `--violet-bright` / `violet`, `live` | `#8B5CF6` → `#A78BFA` | The single accent: lines, active states |
| `--gold` / `gold` | `#E8C277` | **Money amounts and rank 1. Nothing else.** |
| `--silver` | `#CFC6F0` | Ranks 2 and 3 |
| `--hairline` | `rgba(255,255,255,0.08)` | All borders |
| `mint` / `coral` | `#34D399` / `#FB7185` | Connection OK / errors (always with an icon or label) |

## 2. Typography

Two families, both self-hosted through `@fontsource` (no CDN, works offline): **Michroma** 400 for
`/display` titles (`--font-title`, wide uppercase, chrome gradient) and **Sora** 400/600 for
everything else, including all of `/admin`.
Numbers use `tabular-nums` (`.d-num`, `.d-gold`, `.tabular-nums`).

Money is whole rupees, formatted with `formatRupees` (`lib/format.ts`, en-IN: ₹10,000).

Each `/display` screen uses at most three sizes:

- `.d-label` — 0.82u, uppercase, tracking 0.2em, lilac
- `.d-mid` — 1.5u, body and stat values (`.d-strong` white, `.d-gold` money)
- `.d-hero` — Michroma, uppercase, white-to-lilac chrome fill, size set per screen.
  `.d-hero--violet` is the violet variant used for the last word of the opening title.

The opening title is one line; its tracking eases from 0.3em to 0.06em as each word rises. No
outline, extrusion or glow.

## 3. The stage (`client/src/styles/display.css`)

`/display` is a fixed 16:9 stage, letterboxed and centred. `--u` is 1% of the stage width and every
size is a multiple of it, so 1280×720, 1920×1080 and 3840×2160 are the same composition at different
scales. Safe margins are 6u horizontal, 5u vertical (`.d-screen`).

## 4. Surfaces

- **Card** — `.d-card` (display) / `.glass-panel` (admin): 4% white fill, 1px hairline, 24px radius
  at 1080p, 16px blur, faint top highlight. `.d-card--active` adds a soft violet edge light;
  `.d-card--gold` is the rank-1 hairline.
- **Pill** — `ui/Pill.tsx`, `.d-pill`, with an optional pulsing dot.
- **Buttons** — `.btn-violet` (primary), `.btn-gold` (confirming money only), solid white on dark.

## 5. Components (`client/src/components/display/ui/`)

| File | Role |
|---|---|
| `Backdrop.tsx` | The space scene, CSS/SVG only: two drifting nebula glows (`x`/`y`), three twinkling star layers, optional planet horizon (`planet={units it rises}`), optional neon ribbon top-right (`ribbon`), dot grid, vignette. `dim` desaturates it for No sale. |
| `GlassOrb.tsx` | The one 3D element, used on Ready only. High tier: R3F sphere, `MeshPhysicalMaterial` with transmission, local `Lightformer` environment, DPR capped at 1.5, render loop paused when the tab is hidden. Medium/Low or a WebGL failure: CSS gradient orb. |
| `TechIcon.tsx` | Picks the icon for a lot's iconKey (`lot.motif`). High: 3D with real transmission. Medium: 3D with fake glass. Low, no WebGL, or an unknown iconKey: `BoldIcon`. Also exports `preloadTechIcons()`. |
| `icons3d/stage.tsx` | The single canvas and material family for all 3D icons: violet glass, champagne-gold trim (metalness 1, roughness 0.2), a soft glow, local Lightformers, DPR cap 1.5, paused when hidden. Provides `Part` (fly-in assembly), `Link`, `useSoftGlow`. |
| `icons3d/icons.tsx`, `icons2.tsx` | One component per icon, built from primitives: sensors, cameras, drone, prediction, edge, network (icons.tsx); mobile, signage, switching, battery, dashboard, shield (icons2.tsx). |
| `Gavel.tsx`, `gavel3d/Gavel3D.tsx` | The opening screen's hero object, lower centre between the pill and the planet rim (`.d-gavel`). Glass head with two gold bands and end caps, dark handle with a gold ring, glass sound block, a gold orbit ring with a node, and a dashed ring carrying three small glass chips. High: transmission. Medium: fake glass. Low or no WebGL: a bold 2D SVG gavel. |
| `icons3d/icons3.tsx` | The five Event Flow icons (explore, bid, challenge, build, pitch). In medallions they always use fake glass and a 1x pixel ratio, because five canvases run at once; real transmission is kept for single hero icons. |
| `icons3d/icons4.tsx` | The Build Start hero: a thick glass ring with a gold inner rim, gold orbit arcs, four small orbiting gears and an hourglass whose gold sand runs on a 14s loop. |
| `BoldIcon.tsx` | Bold 2D SVG versions: 7px strokes, violet fill, one gold accent. |
| `LotLayout.tsx` | Shared two-column layout for Reveal and Live. The motif card carries the HUD: a rotating dashed ring, a counter-rotating gold arc with an orbiting node, corner brackets that draw in, and a one-time scan line on reveal. |
| `Pill.tsx` | Status pill. |

Not to be reintroduced: Text3D lettering, lens flares, bloom/postprocessing, the reflective floor,
scrims behind text, icon tiles. Stars and the ribbon are back, but as cheap CSS/SVG, and the ribbon
stays in the top-right corner away from text.

## 6. Screens

| State | Composition |
|---|---|
| Opening | Centred title, tagline between two hairlines, pill. About 6s; any key or click skips. |
| Event Flow | Shown after the title when the operator presses Start Event. Title and tagline, five connected glass cards (numbered diamond badge, gold-ringed medallion with a 3D icon, kicker, heading, text, small gold line icon), planet horizon with a podium ring, and a telemetry strip showing the event name and current step. The operator spotlights one card at a time from /admin. |
| Ready | "Next up", lot number `05 / 12`, lot name, orb on the right, segmented progress line. |
| Reveal | Left: category, name, description, three stat cards (90ms stagger). Right: motif card. A thin light line sweeps across once. |
| Live | Same layout, "Auction live" pill, breathing motif, "Awaiting result" slots. No fabricated bids; a leader shows only if the backend sends one. |
| Result | Ivory flash (140ms), then up to three **identical gold cards** in the order the operator entered them: gold gradient border, dark fill, corner ticks, a "Sold" check chip, team ID, team name and the price. Above: "All winners pay ₹X". Below: "Slots left: n / 3", with dashed "Slot open" placeholders for unfilled slots. There is no rank, size or colour difference between winners. |
| Build Start | After the summary. Kicker, headline, tagline between hairlines, message, a ring timer (MM:SS, gold arc, violet twist marker at the midpoint) inside the glass launch ring, three chips from live settings, and technology cards at the left and right edges only. After the 3-2-1 the headline becomes "Build. Solve." and the timer counts down from the server's start time; amber in the last 2 minutes, red at zero. |
| No sale | Dimmed glow, one card. |
| Summary | Team cards in team-ID order with spend bars and count-ups. Not a ranking. |

## 7. Motion (`client/src/lib/motion.ts`)

- Easing `cubic-bezier(0.22, 1, 0.36, 1)`, 500–800ms.
- Spring (stiffness 170, damping 18) only for winner cards.
- Allowed: fade, rise, blur-to-sharp, mask reveal, hairline growth, gentle float, slow glow drift, count-up.
- Ambient loops: stars twinkle 5-9s, nebula drift 26s/34s, planet glow 9s, ribbon sway 16s with
  light trails every 7s/11s, card tilt 14s, HUD ring 48s and gold arc 26s (30s/16s while live).
- 3D icons: sway up to 24 degrees (never a full spin), float 7s, parts assemble over 0.85s with staggered
  delays, then one soft pulse ring at 1.25s. Each icon has its own idle loop.
- Gavel: fades up over 1.2s after the title (2.6s delay; skipped with the rest of the opening), floats on a
  7s loop, sways up to 8 degrees, and every 12s makes one soft strike (head tips 12 degrees over 0.7s,
  one ripple ring under 20% opacity). On leaving the opening it fades and scales down with the screen.
- Event Flow: arrives through a 0.8s portal wipe (circle clip plus one expanding ring) and leaves with a
  depth zoom (scale 0.9, blur, fade). Entrance: title 0.15s, hairlines 0.6s, connector 0.9s, cards from
  1.2s with a 120ms stagger, badge +0.3s, icon assembly +0.35s, kicker +0.45s, heading +0.6s, text +0.8s.
  Spotlight: the active card scales to 1.06 with a travelling edge light and a rotating medallion ring;
  the others dim to 70% brightness with a 0.7px blur.
- Result: cards rise together with a 120ms stagger (spring plus one flip), each lands with a gold ring pulse
  (0.8s) and eight dust motes, then floats on a 7s loop offset per card; the border light runs on a shared
  6s clock so all cards shimmer together; the price gets one sheen sweep at 1.8s.
- Build Start: kicker 0.3s, headline 0.5s, hairlines 1s, message 1.4s, ring assembly 1.5s, timer 2s, side
  cards from 2.1s. Countdown digits are 800ms each, then "Begin" with one 0.6s gold ring pulse.
- One-shots on reveal: light sweep 0.9s, scan line 1.3s, brackets 0.8s, name underline 0.8s.
- `prefers-reduced-motion` is honoured through `MotionConfig reducedMotion="user"` and a CSS media query.

## 8. Admin

Same tokens, flat `panel` surfaces, hairline borders, no 3D. Violet marks active and primary; gold is
the confirm-winners button, amounts and the rank-1 badge. All controls are at least 44px tall
(`.admin` rules in `index.css`). Auction Control has a Reveal → Start → Record → Next stepper and a
live `/display` preview (an iframe forced to the Low tier).

## 9. Known deviations

- **Result does not fade out after 5s.** The display state only changes when the operator advances,
  so fading would leave the projector blank. The result holds until then.
- **The orb does not morph into the motif.** Ready → Reveal is a cross-fade.
- **Quality tier is a manual setting** (Admin → Event Settings), not auto-detected.
