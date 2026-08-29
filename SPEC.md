# Rainbow Run — Game Spec

A js13kgames 2026 compo entry (theme: **Unicorns and Rainbows**). Total zipped package
(code, graphics, audio) must be **under 13,312 bytes**. Working title: **Rainbow Run**
(name can change if the submit form is taken).

Standalone game — not a sequel to Dye Hard / Stolen Rainbows. Shared palette hexes and
the Dye Hard audio pack are a size/look shortcut, not a story link.

---

## 1. Development Rules

These rules govern how code is written for this project.

1. **Readable first, golfed later.** The build pipeline (Terser → Roadroller → advzip/ECT via
   `js13k-vite-plugins`) does heavy minification and compression. Write clear, human-readable
   TypeScript with descriptive variable and function names. Hyper-golfing is a deliberate,
   late-stage activity once the game is mature — never a default style.
2. **Efficient, not clever.** Prefer simple data structures and straightforward algorithms.
   Avoid abstractions, classes, and indirection that don't pay for themselves. The sample
   game in `src/_demo/` shows the preferred idioms (plain modules, const enums as numbers,
   flat entity arrays). Production code lives in `src/*.ts` and must not import `_demo/`.
3. **Repetition compresses well.** Roadroller and zip both reward self-similar code. Don't
   contort code to deduplicate a few lines; consistent, repetitive patterns often produce a
   smaller final package than "DRY" cleverness.
4. **One recipe, derived variants.** Geometry is authored in code (boxes, pyramids, triangle
   strips), not shipped as glTF/OBJ/PNG. One box builder and one strip builder should cover
   the unicorn, obstacles, and road. Per-draw colors, not textures.
5. **Measure, don't guess.** Run `npm run build` regularly and track the zipped size. Byte
   costs are unintuitive post-compression; decisions between approaches should be settled by
   building both when practical.
6. **Budget awareness.** Track the live number in [`SIZE_LOG.md`](SIZE_LOG.md).
   **2026-08-28: advzip 8,019 B (60.24% of 13,312). Headroom 5,293 B.**
   - WebGL1 engine (context, camera, matrices, resize/DPR): ~2–3 KB
   - Path + rainbow road mesh: ~1–1.5 KB
   - Unicorn mesh + run/jump/duck poses: ~1–1.5 KB
   - Gameplay (lanes, obstacles, crystals, lives): ~1.5–2 KB
   - UI (title, HUD, pause, shop, system-font overlay): ~1–1.5 KB
   - Audio (Dye Hard SoundBox player + song + 5 SFX, vendored early): measure immediately
   - If we go over, spend from the **fallback ladder**, cheapest pain first:
     1. Ghost runner — **never in v1** (Director's Cut).
     2. Lighting, shadows, motion blur — **deferred**. Hit-burst boxes shipped; do not grow them into a general FX system.
     3. Mane and tail — drop if the unicorn kit (body, head, horn, four legs) is enough.
     4. Hairpin curves — keep gentle arcs; skip late-game radius tightening.
     5. Shop rows — drop rows, never the whole shop / persistence.
     6. Unique jump vs duck poses — squash/stretch the run mesh instead.
     7. Run cycle — bob the body only; freeze the legs.
     8. Trim SFX — keep pickup + hit; drop the other three.
     9. Drop music, keep SFX (or the reverse, whichever playtests better).
7. **No external dependencies at runtime.** Everything is hand-rolled or vendored. Dye Hard
   audio (`smallplayer.ts` + song + `pickup-sfx.ts`) is copied in, not npm-imported at
   runtime. No three.js, no glTF loaders.
8. **TypeScript strictness stays on.** Types are free — they're erased at build time.
9. **Dev tooling is isolated.** Debug keys/overlays live in `src/debug.ts` and are loaded
   only behind `import.meta.env.DEV`, so they are not part of the production entry.
10. **Director's Cut.** Features cut for the 13 KB zip stay in the repo, isolated so they
    are **not imported by the production entry** (tree-shaking keeps them out of the zip).
    Do not delete them. After the competition they can be wired back for a richer build.
    When cutting something this way: move it under `src/directors-cut/`, leave a comment at
    the old call site explaining the swap, and add a row to the list below.

    Currently isolated: *none yet.*

    Planned Director's Cut (do not build until the core loop ships):

    | Idea | Why it's cut from v1 |
    |------|----------------------|
    | Best-this-run ghost | Byte-heavy (record + replay a path) |
    | Lighting / FX | Luxury; unlit flat color first |
    | Road gaps | Second fall axis + extra mesh |
    | Moving hazards | Extra update + spawn rules |
    | Temple-style L/T junctions | Dual-meaning left/right vs 3 lanes |
    | Landscape / sky props | Road + unicorn only to start |
    | Shop extra lives | Base kit is already 3 lives |

All timing in this spec is expressed in **real time** (seconds/milliseconds), never frames.

---

## 2. Game Overview

### Premise

You are a cute cartoon unicorn running along a seven-color rainbow. The road winds through
empty space. Keep your hooves on the stripes, jump and duck obstacles, and collect **Crystals**.
There is no story win — a run is a new **best distance**.

### Structure

- **Genre:** 3D endless runner (Temple Run / Subway Surfers *feel*, but **no player-triggered
  turns**). Auto-run along a path; the player only changes **lane**, **jumps**, and **ducks**.
- **Path:** a centerline parameterized by distance `s`. **Straights + circular arcs**, generated
  ahead and evaluated by arc-length. Arcs start gentle and tighten with distance (visibility
  around the bend is the late-game modifier). The camera and unicorn **auto-follow** the
  tangent — the player never swipes to rotate. A cubic-spline A/B is optional later; v1 is arcs.
- **Lanes:** three. Lane index `-1 / 0 / 1`. Each lane is **~10% wider than the unicorn**, so
  total road width is **~3.3× unicorn width**. Seven **longitudinal** ROYGBIV bands are painted
  across the full width; they do **not** align 1:1 with lanes (the rainbow should not read as
  three fat highways).
- **A run:** spawn in the **middle lane**, 3 lives, shop bonuses applied. Distance and
  in-run crystal count start at 0. Death (0 lives) ends the run. Banked crystals and shop
  ranks persist; best distance updates if this run beat it.
- **Win:** beat your best distance. Endless otherwise.

### Title screen and flow

- **Title screen:** title **"RAINBOW RUN"** at the top (system font, sans-serif). **Start**
  sits just below the unicorn's hooves; **Upgrades** and **mute** are a smaller pair
  on the next row. Best distance and banked crystals are shown. A 3D unicorn walks
  the road behind the menu.
- **Start** begins a run immediately (no cutscene).
- **Full loop:** title → Start → run → death overlay → title. Upgrades are only from the
  title screen (not forced after death). Pause menu's **Quit to Menu** returns to the title
  (crystals collected this run are kept; best updates only if beaten).

### Run loop

1. **Start:** middle lane, 3 lives, shop ranks applied, speed at the start value.
2. **Play:** auto-run. Lane / jump / duck. Obstacles and crystals spawn ahead and cull behind.
3. **Hit or fall:** lose 1 life, **~2s flashing invulnerability**. An **obstacle** hit
   explodes that barrier into rainbow boxes and you stay in the current lane. A **fall
   off the side** is a visible drop (track keeps scrolling; input locked), then you
   respawn in the **middle lane**.
4. **Death:** last life **fades out (~0.5s)** while the run keeps scrolling, then the
   death overlay. Any tap/key returns to the title.
5. **Pause** (P or the HUD pause button) freezes **everything** — motion, spawns, i-frames
   timer, cooldowns. Overlay: **Resume** and **Quit to Menu**.

**Overlay rule:** overlays never overlap. Pause is the only in-run overlay besides the
death screen (which ends the run).

### Player

- **Lives:** baseline **3** per run. No HP bar. A 1-hit **shield** is a possible shop row,
  not in the base kit.
- **I-frames:** **~2 seconds** after a non-fatal hit or fall. Unicorn **flashes** (~8 Hz
  skip-draw) except during a visible fall or the death fade. During i-frames, obstacles
  and side-falls do **not** apply; crystals still collect. Lane input still works after
  you are back on the road.
- **Hitboxes:** generous. Unicorn collision is a single AABB (or capsule) smaller than the
  visible mesh — about the body, not the horn. Obstacles use simple AABBs. Crystals use a
  pickup radius larger than the sphere.
- **Movement along the path is automatic.** Player state is `s` (distance), `lane`
  (integer, lerped visually), vertical `y` (jump), and a slide timer.

### Lanes, jump, duck

- **Lane change:** one swipe or one key press = **one lane**. Discrete, not analog, not
  hold-to-strafe. Visual position lerps (duration TBD). You **can** change lanes while
  jumping or sliding.
- **Falling off:** from lane `-1`, a left input falls; from lane `+1`, a right input falls.
  There are **no rails**. You stay glued on curves — hairpins do **not** fling the outer
  lane off. Falling is **only** that extra outward input (or a future gap, which is
  Director's Cut). The unicorn slides outward and drops; after ~1.15s it snaps to mid
  lane (unless that fall was the last life, in which case it keeps dropping/fading).
- **Jump:** swipe **up**, **arrow up**, **W**, or **space**. Single jump, no double-jump.
  **Coyote** starts at **80ms** (late jump after leaving the ground). **Input buffer**
  starts at **120ms** and applies to **jump and slide** (early press before landing
  still fires). Pose = the duck pose, translated up.
- **Duck / slide:** **fixed duration**, tap/press, **not** hold-to-stay-down.
  Starts at **550ms**. **Swipe down** or **arrow down / S**. Pose: unicorn
  **splayed on its belly**.
- **Jump vs slide:** opposite gesture **cancels** the current pose — it does **not**
  swap into the other action. Up while sliding stands up (then up again jumps). Down
  while jumping fast-falls and unfolds to **run**. A **second** down while still
  airborne queues a slide until you land (early slide). Last input wins.

### Speed and difficulty

- **Slow start, ramp with distance, soft cap.** Numbers TBD.
- The same distance parameter later **tightens arc radius** (gentle snake → significant
  hairpin). Late-game difficulty is **not seeing** obstacles around the bend, not a
  physics slide-off.
- Speed and obstacle density also ramp with `s` on the winding road.

### Obstacles (v1)

No moving hazards. No road gaps in v1.

| Type | How to clear | Notes |
|------|----------------|-------|
| Low barrier | Jump | Spans one or more lanes |
| High bar / arch | Duck / slide | Spans one or more lanes |
| Lane blocker | Change lane | Solid in that lane; running into it is a hit |

Spawn rules (TBD, tune in play): never block **all three** lanes at the same `s` (always
a safe lane or a jump/duck that works). Fair telegraph before a hairpin.

### Crystals

- In-run pickups. Stand-in **spheres** (or a cheap faceted icosphere / octahedron) until
  a crystal mesh is worth the bytes.
- Placement: **lines** on lanes. Jump barriers get an arc over the top; duck barriers get
  a dip under the bar; open lanes get a short ground line.
- **Banked on death or quit-to-menu.** Uncollected crystals on the road are lost.
- HUD shows **this-run** count; title / shop show the **bank**.
- Magnet (shop) pulls and collects by **lane reach**, not a growing radius (see Shop).

### Fail states

| Event | Result |
|-------|--------|
| Hit obstacle (no i-frames) | −1 life, barrier explodes, 2s i-frames, stay in current lane |
| Outward swipe from outer lane (no i-frames) | −1 life, visible fall, 2s i-frames, **respawn middle lane** |
| Last life | Fade ~0.5s (run still scrolls) → death overlay → title |

### HUD (in-run)

Top of the screen, system font:

- **Pause button** (top-left) — also **P**.
- **Distance** in integer **meters** (top-center).
- **This-run crystals** (top-right).
- **Lives** — heart icons centered under distance.

No speedometer. No best-ghost. Best distance is title + death overlay only.

### UI framework

- **No DOM gameplay UI.** 3D is WebGL; menus/HUD are a **2D canvas overlay** using
  `fillText` so system fonts stay crisp (see §3).
- **Menu input:** mouse click / tap **or** arrow/WASD to move a focus rect + Enter/space
  to select. Touch taps hit the same button rects.
- **Font:** `"Segoe UI", system-ui, sans-serif`. UI copy is short (title, buttons, HUD
  numbers). Prefer **all-caps** labels (START, UPGRADES, RESUME, QUIT) unless a line
  reads better in title case.

### Controls

Works on **desktop and mobile**. Target browsers: **Chrome and Firefox** (including
mobile Chrome). Safari is not a support target, but don't *deliberately* break it.

| Action | Touch | Keyboard |
|--------|--------|----------|
| Lane left / right | swipe left / right | ← → or A D |
| Jump | swipe up | ↑, W, **space** |
| Duck | swipe down | ↓ or S |
| Pause | HUD button | **P** |
| Menu select | tap | Enter / space / click |

- Swipes are **run-only**. Title, shop, pause, and death use taps/clicks so a swipe
  doesn't steal a button press.
- `preventDefault` on touch during a run so the page does not scroll.
- Viewport: no user scaling (`maximum-scale=1, user-scalable=no`), same idea as Dye Hard.

### Persistence

`localStorage` key **`rr`**. One JSON blob:

| Field | Contents |
|-------|----------|
| Crystals | Banked total |
| Best distance | Integer meters |
| Shop ranks | Array, one int per row (0–3) |
| Mute | Boolean |

Corrupt / missing / private-mode saves are ignored (start fresh). A run does **not**
save position, lives, or in-run crystals separately — those either bank at end or vanish.

### Shop (Upgrades)

Reachable from the title **Upgrades** button. Spend **banked crystals**. Each row **3
ranks**. Prices and per-rank amounts TBD. **Not** in the shop: extra lives (base kit is
already 3).

**Planned rows (v1):**

| Row | 3 ranks |
|-----|---------|
| Magnet | **Lane reach:** (1) current lane, including above/below you; (2) adjacent lanes (center reaches both); (3) all three lanes |
| Crystal value | More banked crystals per pickup |
| Start speed | Faster at run start |
| Jump height | Higher jump per rank |
| Shield | Optional, not shipped. Cut first if the shop is fat. |

### Death overlay

Shown after the last-life fade. Evenly stacked:

- **RUN OVER**
- This-run **distance** (m)
- This-run **crystals**
- **"NEW BEST!"** if `distance > best`
- **TAP TO CONTINUE** (larger). Any click / tap / key returns to title

### Audio

- **Vendored from Dye Hard on the first audio-capable build**, for an honest SIZE_LOG,
  even if the mapping is placeholder. Copy `smallplayer.ts` (SoundBox `CPlayer` + song)
  and `pickup-sfx.ts` (five Voxby SFX). Unlock `AudioContext` on the first pointer/key
  gesture. Title **mute** (persisted) silences music + SFX.
- Dye Hard SFX slots: crystal pickup, powerup/unlock, nova, enemy/portal hit, horn.
  **First mapping:** pickup → crystal, hit → obstacle/fall, powerup → shop buy or extra
  life flash, horn/nova → jump/slide placeholders. Remix later; don't invent a new
  player until the zip says we must.
- ZzFX/ZzFXM stay in `src/_demo/` only.

---

## 3. Technical Design

### Rendering: WebGL1 + 2D overlay

- **3D:** raw **WebGL1**, unlit. No textures, no three.js, no lighting in v1. One program:
  attribute `position`, uniforms combined MVP, **flat color**, and **alpha** (death fade).
  Color is per-draw, not a vertex attribute.
- **UI:** a second full-viewport **2D canvas** stacked on top. `fillText` / `fillRect`
  for HUD and menus. This is how system fonts stay crisp.
- **Resize:** both canvases fill the window. Backing store = `clientSize * devicePixelRatio`
  (capped if needed). Set `canvas.width/height` to the backing size and CSS to 100% of
  the viewport. 2D context `setTransform(dpr,0,0,dpr,0,0)` so UI layout is in CSS pixels.
  WebGL `viewport` matches the backing size. **No letterboxing.** **No pixel-art upscale.**
- **Clear color:** a sky that makes the rainbow pop (TBD; solid is enough — no skybox).

### Camera

- **Chase cam:** behind and slightly above the unicorn, looking along the path tangent.
  Follow distance, height, pitch, FOV TBD — unicorn should read as a character, with
  enough road ahead to react.
- Camera is a function of `s` (and later the path frame), not of lane offset, or only a
  tiny lateral ease so strafing doesn't swing the horizon. Prefer **stable horizon**.
- On arcs, the camera yaws with the tangent (auto). No extra player turn animation.

### Path

Player position:

```
pos = pointOnPath(s) + laneOffset * normal(s) + (0, y, 0)
```

- Current: polyline of **straight segments + circular arcs**, evaluated by arc-length
  `s`. Frenet/normal from the tangent. Yaw 0 = +Z; `tangent = (sin yaw, 0, cos yaw)`;
  `normal = (cos yaw, 0, -sin yaw)` so lane `+1` is +X on a straight. A cubic spline
  A/B is optional; v1 stays arcs.
- Generate **ahead** of the camera and **cull** behind. Fully procedural; no hand
  chunks. Seeded RNG so a ghost/replay *could* be added later without rewriting the
  generator (ghost itself is still Director's Cut).
- Road mesh: triangle strip (or quad strip) along the centerline, 7 colored bands.
  Straights need few subdivisions; arcs need enough segments to look smooth (count TBD).

### Game state

- Flat module-level state, following the sample's structure.
- Scene flag: title / run / pause / death / shop — a simple variable, not a framework.
- Obstacles and crystals: arrays of `{ s, lane, type, ... }`, spawned in front of `s`
  and removed behind.

### Models: procedural primitives (smallest bytes)

No exported meshes. Build at startup:

- **`box(sx, sy, sz, color)`** — 8 verts, 12 triangles (or 6 unlit faces).
- **`pyramid` / 4-sided cone** — horn.
- **`strip`** — road (and maybe a cheap octahedron for crystals).

**Unicorn kit** (cute cartoony, white / silvery, low poly):

| Part | Primitive | Notes |
|------|-----------|--------|
| Body | Box | Slightly long; the width **1.0** is the lane-sizing unit |
| Neck | Box | |
| Head | Box | **Long face** |
| Horn | Pyramid | On the forehead; readable in silhouette |
| Legs ×4 | Boxes | Run cycle: opposite pairs swing `sin(s)` / `sin(s+π)` |
| Mane | 1–3 thin boxes | **Only if** the zip can afford it |
| Tail | 1–2 boxes | **Only if** the zip can afford it |

Colors: off-white body, slightly cooler/silver sheen as a second vertex color if it's
free (two shades of grey-white via separate draws), horn a pale gold or white, hooves darker grey. Iterate
the proportions in play — first mesh is a **readable placeholder**, not final art.

**Draw path:** a tiny matrix stack (translate/rotate/scale around a shared box) is
almost certainly smaller than unique vertex blobs per part. Upload a unit box once;
draw it ~8 times with different uniforms.

**Duck / jump pose:** same hierarchy, different local transforms (body flattened /
pitched onto the belly, forelegs +Z, hind legs −Z). Jump = that pose + `y`. No second
mesh.

**Obstacles:** colored boxes / a horizontal bar / an arch made of 2–3 boxes.

**Crystals:** sphere-ish stand-in (octahedron is 6 verts). Dye Hard pickup color if we
want a family resemblance; otherwise a bright cyan/white.

### Text rendering

System fonts via the overlay canvas. Layout in CSS pixels. Stroke or a dark plate
behind HUD numbers so they read on any sky. Do **not** pack a bitmap font unless
system `fillText` blows the zip (it shouldn't — the font itself isn't shipped).

### Input implementation notes

- Keyboard: edge-triggered lane / jump / duck (one press = one action). Pause on P
  keydown.
- Touch: record `touchstart` position; on `touchend` (or after a movement threshold),
  classify axis-dominant swipe (dx vs dy). Ignore tiny motions (tap threshold so HUD
  buttons still work if a 2D overlay hit-test consumed the tap).
- Menu focus + click sharing one `ui.ts`-style helper, same idea as Dye Hard.

---

## 4. Palette and look

Seven rainbow colors — **same hexes as Dye Hard**, used as road stripes (red at one
edge through violet at the other; which edge is left is a one-line choice, pick and
don't churn):

| Color  | Hex      |
|--------|----------|
| Red    | `e40404` |
| Orange | `ff8200` |
| Yellow | `f1e300` |
| Green  | `08ba00` |
| Blue   | `0030e2` |
| Indigo | `6c00ef` |
| Violet | `a656ff` |

Unicorn neutrals (not in that table): white / silver greys / black outlines are **not**
required if we are unlit boxes — a dark-grey hoof and a mid-grey inner-ear are enough
contrast.

Background: solid clear-color, TBD.

---

## 5. Open Questions / TBD

Locked decisions are in §2–§3. Remaining knobs are **tune in play** unless noted:

- Speed: start, ramp rate, soft cap.
- Jump height, air time, coyote / buffer / slide — starting knobs in `constants.ts`
  (80 / 120 / 550 ms). DEV F3 tuner; lock numbers here after playtest.
- Lane-lerp ms.
- Obstacle sizes, telegraph distance, density vs `s`.
- Crystal value baseline and spawn density (magnet is lane-reach, already locked).
- Shop prices and per-rank amounts; whether Shield ships; Start speed vs cap.
- Unicorn proportions (long face, horn size, leg length) — iterate on the first mesh.
- Camera: FOV, follow distance, height; how much road-ahead at start vs high speed.
- I-frame flash rate.
- Sky clear-color.
- Swipe pixel threshold; whether swipe is measured on end or after a lock-in distance.
- Final SFX mapping / remix.
- Cubic-spline path A/B vs the shipped circular arcs.

---

## 6. Build Guidance & Execution Order

A suggested phase order, sequenced so each phase is playable and only depends on the
ones before it. "Flagship" = interlocking systems, byte- or camera-sensitive.
"Capable" = well-specified work from this spec.

`src/_demo/` stays the starter platformer and is **not** the production entry.
Production is `src/index.ts` + new modules. Vendoring Dye Hard audio should happen
**as soon as there is a user gesture** (ideally by the end of phase 5) so SIZE_LOG
includes it before we add more game.

| Phase | Work | Model | Why | Complete |
|-------|------|-------|-----|----------|
| 1 | **Engine + straight road:** WebGL1 context, DPR resize, perspective camera, unlit shader, 7-stripe plane, auto-run along +Z | Flagship | Every later system sits on the camera/path contract | ✅ |
| 2 | **Lanes + fail:** 3 lanes, keyboard + swipe, fall off outer edges, 3 lives, 2s flash i-frames, snap-to-middle on fall | Flagship | Input has to feel identical on desktop and mobile | ✅ |
| 3 | **Unicorn kit:** box/pyramid hierarchy, chase cam framed on the mesh, run-cycle leg swing | Flagship | Proportions + camera framing are one loop; placeholder is expected | ✅ |
| 4 | **Jump / duck + obstacles:** coyote + buffer, space/W/up jump, swipe-down/S slide, low / high / lane-block, generous AABB | Flagship | The actual game; spawn fairness matters | ✅ |
| 5 | **Crystals + HUD + death + title:** spheres, distance m, this-run crystals, lives, death overlay, Start on title | Capable | UI overlay + `fillText` unblocks shop/pause | ✅ |
| 6 | **Meta:** localStorage, mute, pause (P + button, Resume/Quit), shop rows, banked crystals on title | Capable | Persistence rules are precise; reuse the menu helper | ✅ |
| 7 | **Audio drop-in:** Dye Hard SoundBox + 5 SFX, first mapping, SIZE_LOG snapshot | Capable | Byte reservation; must land before we believe any budget | ✅ |
| 8 | **Poses + cheap extras:** belly-splay duck/jump pose; mane/tail only if the zip says yes | Capable | Visual identity; easy to cut | ✅ |
| 9 | **Arcs:** circular-arc path, camera follows tangent, radius tightens with distance | Flagship | Same controls; new projector for `pointOnPath` / `normal` | ✅ |
| 10 | **Tune + ship:** §5 numbers, fallback ladder, golf | Flagship | Playtest judgment and Rule 5 | |

Notes:

- Phases 1–9 are shipped. Playtest polish after arcs (visible fall, hit burst, jump/duck
  cancel, crystal lines, magnet lane-reach, death fade, title/HUD plates) is locked in §2.
- Phase 10 is numbers, leftover §5 knobs, fallback ladder, and golf.
- If phase 3 (unicorn) is blocking the feel of phase 2, a colored box as a stand-in
  player is allowed for a day — don't polish the mesh before lanes work.
