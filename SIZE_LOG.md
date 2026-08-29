# Size log

Limit: **13,312 B**. Zip is the scoreboard (`npm run build` → advzip).

## 2026-08-28 — first playable loop

**advzip: 7,171 B (53.87% of 13 KB). Headroom 6,141 B.**

Straight-road Rainbow Run: WebGL1 engine, 3 lanes, unicorn kit (mane/tail included), jump/duck/obstacles, crystals, title/pause/shop/death, Dye Hard SoundBox + 5 SFX. `public/i.png` (starter sheet) moved to `src/_demo/` so it is not zipped.

| Milestone | advzip | % of 13 KB | Headroom | Notes |
|-----------|-------:|-----------:|---------:|-------|
| First loop (phases 1–8, no arcs) | 7171 | 53.87% | 6,141 | Audio vendored. Starter PNG not shipped. |
| With starter `public/i.png` | 8215 | 61.71% | 5,097 | Don't ship demo art |
| Circular-arc path (phase 9) | 8019 | 60.24% | 5,293 | Straights + arcs, camera follows tangent. +848 B vs first loop |
| Pre-audit (unlogged growth) | 9949 | 74.74% | 3,363 | Shop drops / wings / shield / health since arcs. Not a dedicated milestone. |
| Size audit trim | 9834 | 73.87% | 3,478 | −115 B. Dead helpers, old save remap, shared song pad, compact SFX rows. |

Next honest number: after cubic-spline A/B, or tune + ship (phase 10).
