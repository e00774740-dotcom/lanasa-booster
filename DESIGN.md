# Design Brief

## Direction

Cosmic Ignition — a mission-control dashboard for a cosmic booster, deep-space void with electric plasma accents.

## Tone

Retro-futuristic cosmic maximalism: a near-black violet void, luminous cyan-to-magenta plasma, and telemetry-HUD details executed with conviction.

## Differentiation

The "mission control" telemetry language — monospace readouts, glowing booster gauge, and a plasma gradient that shifts cyan→magenta across the whole system — makes it feel like a spacecraft console, not a generic dark utility app.

## Color Palette

| Token      | OKLCH         | Role                                      |
| ---------- | ------------- | ----------------------------------------- |
| background | 0.13 0.025 285 | cosmic void canvas                        |
| foreground | 0.95 0.012 285 | primary text                              |
| card       | 0.175 0.032 285 | elevated telemetry surfaces             |
| primary    | 0.78 0.16 195  | electric cyan — CTAs, gauge, active state |
| accent     | 0.68 0.24 330  | hot magenta — highlights, secondary glow  |
| muted      | 0.24 0.04 285  | subdued panels, secondary text            |

## Typography

- Display: Space Grotesk — app name, headings, gauge numbers
- Body: General Sans — labels, paragraphs, buttons
- Mono: Geist Mono — telemetry readouts, metrics, percentages
- Scale: hero `text-4xl md:text-6xl font-bold tracking-tight`, h2 `text-2xl md:text-3xl font-bold tracking-tight`, label `text-xs font-semibold tracking-widest uppercase`, body `text-base`

## Elevation & Depth

Layered surfaces (background → card → popover) with soft violet shadows plus selective cyan/magenta glow on the gauge and primary CTA; depth comes from layering, not flat color.

## Structural Zones

| Zone    | Background            | Border        | Notes                                          |
| ------- | --------------------- | ------------- | ---------------------------------------------- |
| Header  | bg-card/80 backdrop-blur | border-b   | App name + ninja mark, sticky, elevated      |
| Content | bg-background + starfield | —         | Centered single column, card grid alternates |
| Footer  | bg-muted/40           | border-t      | Status line + version, subdued               |

## Spacing & Rhythm

Generous vertical rhythm: `gap-6` between major zones, `gap-4` inside groups, `p-5` on cards; mobile-first single column widening to a centered max-width on desktop.

## Component Patterns

- Buttons: full-width pill (`rounded-full`), plasma gradient fill + glow for primary; thin violet-outlined ghost pills for secondary
- Cards: `rounded-2xl`, `bg-card`, 1px border, `shadow-subtle`, monospace value + status dot
- Badges: small pill, tinted `primary`/`success`/`warning` with matching text

## Motion

- Entrance: `animate-fade-up` staggered on load (0.5s cubic-bezier)
- Hover: `transition-smooth` on buttons/cards, subtle lift + glow intensify
- Decorative: `animate-float-slow` ambient orbs, `animate-pulse-glow` on the gauge ring, `animate-scan` HUD line

## Constraints

- Dark mode only — the cosmic void is the identity
- 3–5 core colors: cyan primary, magenta accent, violet void, plus semantic green/amber/red status
- Spanish UI copy throughout; responsive from 360px phone to desktop

## Signature Detail

A glowing circular booster gauge with a cyan→magenta plasma arc and a monospace percentage readout — the mission-control centerpiece.
