# Autumn cosmetics

- New IDs: neon_glitch, lightning_core, stellar_orbit, autumn_vortex.
- Default prices: 80, 100, 120, 150 points. Teachers configure actual prices and class stock in the existing shop management panel. No production stock migration is performed.
- Legacy cosmetics are retired from sales, not deleted. Owned legacy items can still be equipped. Honor titles remain teacher-granted.
- Purchase API rejects retired/unknown/title cosmetics even if an old shop document is active.
- New class typing score creation snapshots boosterBonusSeconds from the already-loaded student's owned/equipped cosmetic. No additional read, write, subscription or polling is added for the bonus.
- Existing game score documents are not upgraded on reentry. Equipment changes apply to newly created game records only.
- The bonus is five seconds, never stacks, and does not apply to guests, practice, duels or subway. Teacher booster disable still takes priority.
- Animation uses CSS with embedded SVG strips; no remote image requests, JS frame loop or DB access. Reduced-motion users get static decorations.
- DB-free preview: /tests/season-preview.html on the local Vite server.
- Tests: node --test tests/season-cosmetics.test.mjs tests/season-purchase.test.mjs; node tests/season-browser.mjs.
