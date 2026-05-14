# Just Mint Card Care — A4 Pricing Sign · Master Prompt

A complete brief for re-creating (or evolving) the pricing sign in any tool.

---

## THE ASK

Design a single-page **A4 portrait** (210 × 297 mm) pricing sign for **Just Mint Card Care**, a trading-card cleaning and restoration service. The sign will be printed and displayed (and shared digitally as a PDF). It should match the company's "mint" identity — pristine, fresh, top-grade — while reading as a refined apothecary catalogue rather than a casual flyer.

---

## DESIGN PHILOSOPHY — *MINT APOTHECARY*

A philosophy of restraint, conservation, and quiet authority — the visual language of an atelier whose discipline is the preservation of small, valuable objects. Information is *catalogued*, not sold. The page should feel like the formulary of a nineteenth-century chemist's shop or the catalogue card of a small museum: every margin measured, every numeral set with patience, every hairline calibrated. Master-level craftsmanship that reads as inevitability, not decoration.

Key principles:

- **Restraint over flourish.** Negative space is the most expensive element on the page.
- **Catalogue logic.** Each service is a small monograph with name, description, turnaround, and price.
- **Hairline precision.** All dividers at copperplate weight (~0.15–0.4 mm).
- **No marketing voice.** No taglines. The work itself is the brand statement.

---

## COLOR PALETTE

| Token       | Hex      | Use                                            |
|-------------|----------|------------------------------------------------|
| Cream       | `#F2EDE3` | Page background — warm, unbleached linen      |
| Cream Deep  | `#E9E1D2` | Subtle background variant                      |
| Mint Pale   | `#CFE3D2` | Note tag fills, soft accents                   |
| Mint        | `#8FB89A` | Hairlines and soft typographic accents         |
| Mint Deep   | `#5C8B6E` | Numerals, micro-labels, secondary text         |
| Forest      | `#1B3A2D` | Wordmark, primary text, hairline rules         |
| Ink         | `#14201B` | Body copy                                      |
| Bronze      | `#A88556` | Reserved accent (very sparingly)               |

Background carries an almost-imperceptible dot grid (radial-gradient at ~3% opacity, 1.8 mm pitch) for paper texture.

---

## TYPOGRAPHY

| Role                      | Family               | Style / Size                       |
|---------------------------|----------------------|-------------------------------------|
| Wordmark                  | Italiana             | Regular · ~22 mm (≈62 pt) · two-line stack, line-height 0.96, slight negative tracking |
| Section labels (caps)     | Work Sans            | SemiBold · 8.5 pt · tracked 0.7 mm · uppercase |
| Service names             | IBM Plex Serif       | SemiBold · 13 pt · uppercase · tracked 0.3 mm |
| Service descriptions      | Instrument Serif     | Italic · 10.5 pt · line-height 1.32 |
| Numerals & prices         | IBM Plex Mono        | SemiBold · 19 pt (price), 9 pt (numeral) |
| Turnaround micro-label    | IBM Plex Mono        | Regular · 6.5 pt mint-deep + 8.5 pt forest value |
| QR labels                 | Work Sans            | SemiBold · 7 pt · tracked uppercase |
| QR handles                | IBM Plex Mono        | Regular · 7.5 pt                    |
| Footer notes              | Instrument Serif     | Italic · 9.5 pt with mint-pale "NOTE" tag in Work Sans 6.8 pt |

---

## PAGE STRUCTURE (top → bottom)

1. **Header** — left-aligned wordmark *"Just Mint / Card Care"* (two lines, Italiana). Upper-right: a small circular monogram seal labeled `JMCC` in IBM Plex Mono. Forest hairline divider beneath header (~0.4 mm).
2. **Card Care Services** — section label *"Card Care Services"* with `i · ii · iii · iv` annotation on the right. Four service rows below.
3. **Bulk Submissions** — a fifth row marked with an em-dash, styled slightly smaller and tinted bronze.
4. **Payment + Connect** — two-column footer grid separated by a 0.4 mm forest rule above and a thin vertical mint rule between columns.
5. **Notes** — two italic note lines, each prefixed with a mint-pale `NOTE` tag.

Page padding: 17 mm top · 18 mm sides · 16 mm bottom · 7 mm row gap.

---

## SERVICES (final content)

Each service row uses a 4-column grid: **roman numeral | name + italic description | turnaround | price**.

| #   | Service              | Description                                                                     | Turnaround    | Price |
|-----|----------------------|---------------------------------------------------------------------------------|---------------|-------|
| I   | Clean · Polish       | Surface clean and polish of holo to reduce micro-abrasions.                      | 1 week        | $8    |
| II  | Dents                | Controlled relaxation and re-bonding of surface layers. Clean + Polish included. | 1 week        | $50   |
| III | Corner · Edge Lifts  | Controlled relaxation and re-bonding of surface layers. Clean + Polish included. | 1–2 weeks     | $30   |
| IV  | Creases              | Humidity- and pressure-based fiber relaxation. Clean + Polish included.          | 1.5–3 weeks   | $70   |
| —   | Bulk Submissions     | A standing courtesy on larger consignments — please ask when scheduling.         | —             | 10% off |

---

## PAYMENT SECTION

Two QR blocks side-by-side, each 32 × 32 mm with cream-mint corner brackets (small mint hairline tick at each of the four outer corners — apothecary register-mark feel). Below each QR: **network name (small caps)** and **handle (mono)**.

- **Venmo** — `@Justin-Lo-18` *(use the user-supplied QR exactly as provided; only crop the "Justin Lo" header and "Scan to pay" footer; never regenerate)*
- **PayPal** — `Justin Lo` *(same — use exact QR, crop labels only)*

Below the QR row, centered italic line: *"Cash also accepted."*

---

## CONNECT SECTION

Single 36 × 36 mm Instagram QR (same corner-bracket frame), centered. Below: `Instagram` label and `@justmintcardcare` handle in mono. Centered email line in mono: `justminttcg@gmail.com`. Below that, italic centered line: *"DM to schedule  ·  Local drop-off."*

The Instagram QR encodes: `https://www.instagram.com/justmintcardcare/`

---

## FOOTER NOTES

Two side-by-side italic lines, each tagged with a small mint-pale rectangle reading `NOTE`:

- *Whitening **cannot** be fixed.*
- *Ask about bundle deals for cleaning.*

---

## WHAT IS DELIBERATELY EXCLUDED

- **No marketing tagline** anywhere.
- **No "edition," date stamp, or version number.**
- **No emoji or decorative dingbats** beyond the em-dash and a single `·` separator.
- **No regenerated QR codes** — the Venmo and PayPal QRs must be the user's exact provided artwork (only the "Justin Lo" name labels removed).
- **No marketing colors** (no bright greens, no neon mint). Stay within the muted palette above.

---

## TECHNICAL DELIVERABLES

1. `just-mint-card-care_pricing-sign.html` — single self-contained file. Loads Google Fonts. Uses CSS `@page { size: A4 portrait; margin: 0; }` and `print-color-adjust: exact` for accurate print output.
2. QR images placed alongside the HTML as `qr-venmo.png`, `qr-paypal.png`, `qr-instagram.png` are auto-loaded; otherwise an elegant SVG placeholder shows.
3. `just-mint-card-care_design-philosophy.md` — the full Mint Apothecary manifesto.
4. Print path: open in Chrome → ⌘/Ctrl-P → *Save as PDF · A4 · No margins · Background graphics ON.*

---

## VOICE & TONE (FOR ANY COPY EDITS)

- **Quiet, confident, conservation-grade.** Like a watchmaker writing a service ticket.
- **Italics for description, mono for measurement.** Do not mix.
- **Avoid superlatives.** No "premium," "elite," "professional." The composition itself communicates expertise.
- **Title-case service names; lowercase descriptions; uppercase section labels.**

---

*This brief is the canonical reference for any future iteration of the Just Mint Card Care pricing sign — print, web, or otherwise.*
