# LMAB Product Design QA

## Report v3

- Source visual truth: `https://design.understudylabs.com/`, `/Users/luis/Developer/understudy/understudy-design/design.md`, `/Users/luis/Developer/understudy/understudy-design/tokens/primitives.json`, and `/Users/luis/Developer/understudy/understudy-design/tokens/semantic.json`
- Current source screenshot: `/tmp/understudy-design-live-surfaces-v3.png`
- Implementation: `tests/fixtures/anthropic-app/.lmab/report.html`
- Desktop screenshot: `/tmp/lmab-report-simplified-desktop-v3.png`
- Mobile screenshot: `/tmp/lmab-report-simplified-mobile-v3.png`
- Side-by-side comparison: `/tmp/lmab-report-simplified-comparison-v3.png`
- Viewports: 1280 × 720 desktop and 390 × 844 mobile
- State: synthetic Anthropic app, six static opportunities, one detected route

### Findings

No actionable P0, P1, or P2 mismatch remains.

- Fonts and typography: passed. The report now uses one controlled scale: 52/34px responsive headline, 24px section titles, 15px row titles and body, 13px support copy, and 10px structural labels. IBM Plex Mono carries structure while IBM Plex Sans carries explanations.
- Spacing and layout rhythm: passed. A 920px reading rail, 64px desktop section rhythm, compact metadata, hairline-led lists, and restrained route cards keep the document scannable.
- Colors and visual tokens: passed. LMAB now uses the prescribed paper register: warm paper, white cards, black ink, quiet rules, sparse stamp red, Anthropic clay only for the vendor label, and mint only for the strongest candidate route.
- Image quality and asset fidelity: passed. The portable report requires no imagery, icons, or generated substitutes, so no visible source asset is missing.
- Copy and content: passed. “We found 6 cost-saving opportunities” makes one clear claim. “Recommended changes,” “Detected routes,” “Evidence,” and “About this report” remove the previous layered editorial phrasing while preserving the claim boundary.
- Responsiveness: passed. The desktop document has no horizontal overflow. At 390 × 844 the hero, metadata, ledger, route cards, evidence rows, and footer collapse cleanly with no horizontal overflow.
- Browser behavior: passed. The local report produced no console warnings or errors in either tested viewport.

### Comparison history

#### Initial implementation

- P1: the black-field report used the product register even though Design v2 explicitly assigns LMAB reports and long-form proof to the paper register.
- P1: clay was used as a generic confidence color, conflicting with its current Anthropic vendor meaning.
- P2: every section was presented as a rounded dark card, which obscured the guide's quiet structure and hairline rhythm.

#### Revised implementation

- Moved the report to the warm paper and white-card token roles.
- Reserved stamp red for sparse document identity and claim-boundary emphasis.
- Reserved Anthropic clay for the vendor label and mint for the strongest candidate route.
- Rebuilt the ranked recommendations as a hairline evidence ledger and kept cards only where they communicate route grouping.

#### Simplification review

- P1: the isolated 148px opportunity count read as model theater rather than a report claim.
- P1: 148px hero type, 52px section titles, 22px route titles, 16px row titles, and tiny metadata created an inconsistent scale and made the page harder to scan.
- P2: repeated phrases such as “Start here,” “What the scanner found,” “Evidence before claim,” and “What this proves” added editorial ceremony without adding evidence.

#### Simplified implementation

- Replaced the isolated count with one sentence: “We found 6 cost-saving opportunities.”
- Reduced the typography to five explicit roles and capped the desktop headline at 52px.
- Narrowed the report to a 920px reading rail and reduced section spacing from 96px to 64px.
- Renamed the sections with plain labels and collapsed the claim boundary into a compact “About this report” note.
- Post-fix side-by-side review confirms the paper register, readable evidence density, quiet structure, and consistent type hierarchy.

## Installer comparison

- Source visual truth: `/Users/luis/Library/Application Support/CleanShot/media/media_HSeBwkdGbT/CleanShot 2026-07-10 at 16.05.17@2x.png`
- Implementation screenshot: `/tmp/lmab-installer-prompt-static.svg.png`
- Secondary CLI state: `/tmp/lmab-audit-render.png`
- Real install completion state: `/tmp/lmab-real-install.png`
- Full-view comparison: `/tmp/lmab-installer-comparison-final.png`
- Viewport: 140 columns × 35 rows, true-color terminal
- State: first-run installer overview at the confirmation prompt
- Focused comparison: not required; the wordmark, section titles, plan rows, trust copy, and confirmation prompt are all legible in the full-view comparison.

No actionable P0, P1, or P2 mismatch remains.

- Fonts and typography: passed. Both use the terminal's monospace face, a large gradient wordmark, dim supporting copy, bold section labels, and colored numbered choices.
- Spacing and layout rhythm: passed. The implementation preserves the reference's banner-to-thesis-to-section cadence, cyan rules, indented content rail, and compact prompt placement.
- Colors and visual tokens: passed. LMAB intentionally replaces Understudy's indigo-to-green gradient with its clay-to-amber-to-mint palette while retaining the reference hierarchy and contrast.
- Image quality and asset fidelity: passed. The installer is a terminal-native text interface; no image, icon, or logo asset from the reference is omitted or replaced with a placeholder.
- Copy and content: passed. LMAB removes the irrelevant multi-agent chooser and replaces it with a three-step Claude-only plan plus an explicit local-data boundary.
- Responsiveness: passed at the 140-column reference width. The 61-column wordmark remains inside an 80-column terminal, and long trust copy is split across lines.
- Audit completion state: passed. The direct CLI preserves the same wordmark, section rule, success semantics, and compact information rail; artifact paths are repo-relative to prevent horizontal clipping.
- Real install state: passed. A public branch install in a disposable home renders all three stages, success marks, command location, and next command without clipped content or residual LMAB paths after uninstall.

### Installer comparison history

- Initial P1: the plain `lmab`-prefixed paragraph block had no product identity or hierarchy.
- Initial P1: the destructive-looking `[y/N]` gate made the one-line funnel feel hesitant and unfinished.
- Initial P2: install steps, privacy boundaries, and launch behavior were visually indistinguishable.
- Revised: added the LMAB gradient wordmark, thesis line, section rules, numbered plan, default-yes CTA, staged progress states, and plain-output fallback for logs and CI.
- Post-fix evidence: the side-by-side capture matches the reference's visual density and interaction state while remaining materially smaller and Claude-only.

## Final result

final result: passed
