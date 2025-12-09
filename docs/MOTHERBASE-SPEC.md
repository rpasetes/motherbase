# MOTHERBASE: Technical Specification

## One-Sentence Brief

A living ASCII ocean simulation behind unstyled HTML — real wave footage translated to characters, fish that ARE the navigation, the craft hidden in the background, the content brutally native. This says: *I've always been here, I've never left.*

---

## Core Architecture

Three layers, stacked:

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: ASCII FISH (navigation)                       │
│  Portfolio projects as swimming creatures               │
│  Interactive, clickable, alive                          │
├─────────────────────────────────────────────────────────┤
│  LAYER 2: HTML CONTENT (identity)                       │
│  Raw, unstyled HTML — photo, bio, links                 │
│  Static, grounded, deliberately primitive               │
├─────────────────────────────────────────────────────────┤
│  LAYER 1: ASCII OCEAN (environment)                     │
│  Video-to-ASCII wave translation                        │
│  Always moving, cursor-interactive                      │
└─────────────────────────────────────────────────────────┘
```

---

## Layer 1: ASCII Ocean Background

### Concept

Real wave footage translated to ASCII characters in real-time. The source is authentic (actual ocean), the rendering is web-native (characters on canvas). Color is applied to the characters themselves — the ASCII IS the texture.

### Recommended Library

**aalib.js** — dependency-free video-to-ASCII
- npm: `aalib.js`
- Renders video → ASCII to canvas
- Configurable character set and dimensions

### Source Video

- **Ideal**: Actual Tumon Bay / Guam beach footage
- **Fallback**: Pacific island shoreline loop, waves POV
- **Requirements**: 
  - Looping (10-30 seconds)
  - High contrast between water/sand/foam
  - Shot from shore looking at incoming waves

### Implementation Approach

```javascript
// Pseudocode structure
aalib.read.video.fromVideoElement(document.querySelector("video"))
  .pipe(aalib.aa({ 
    width: 160,   // character columns
    height: 90    // character rows
  }))
  .pipe(aalib.render.canvas({ 
    el: document.querySelector("#ascii-bg")
  }))
  .end();
```

### Color System

- Extract luminance from original video pixels
- Map to gradient based on Y position + luminance:
  - Top: Deep ocean teal (#1a5f5f → darker)
  - Middle: Shallow water / foam (lighter teals, whites)
  - Bottom: Wet sand → dry sand (warm tans, #c4a574)
- Characters are colored individually — no flat background

### Character Palette (for reference/fallback)

| Element | Characters | Notes |
|---------|------------|-------|
| Deep water | `░` `~` | Darker, slow movement |
| Shallow water | `~` `∽` `≈` | Lighter, faster movement |
| Foam/surf | `'` `.` `:` `*` | White/bright, wave edges |
| Wet sand | `.` `:` `,` | Darker tan |
| Dry sand | `.` `·` ` ` | Lighter tan, sparse |

### Cursor Interaction

- Cursor creates displacement/ripples in the ASCII field
- Could be: radial distortion, character displacement, "wake" trail that fades
- Interaction happens WITH the translated output, not the source video
- Consider: interference patterns, sonar ping effect

### Performance Targets

- 30fps minimum, 60fps ideal
- Character grid density adjustable for performance
- Canvas-based rendering (not DOM per character)

---

## Layer 2: Raw HTML Content

### Concept

The content layer is deliberately primitive — unstyled HTML as it would appear in 1997. The professional flex is hidden in the background simulation. The actual content is humble, native, unadorned.

### Styling Rules

- **No CSS framework**
- **No custom fonts** — browser defaults (Times New Roman, serif)
- Default link colors: blue `#0000EE`, visited purple `#551A8B`
- Default margins, default line-height
- Underlined links (the default)
- No hover effects on links

### HTML Structure

```html
<body>
  <div class="photo-container">
    <img src="russell.jpg" alt="russell" border="1">
  </div>
  
  <h1>hi, i'm russell</h1>
  
  <p>
    [Bio text — written raw, less polished-professional, 
    more like a text file you'd find on someone's server]
  </p>
  
  <p>
    <a href="resume.pdf">resume</a> · 
    <a href="https://github.com/rpasetes">github</a> · 
    <a href="https://linkedin.com/in/...">linkedin</a> · 
    <a href="https://twitter.com/...">twitter</a>
  </p>
</body>
```

### Photo Interaction: Hover-to-Dither

**Plugin**: `dither-plugin` by flornkm
- npm: `npm install dither-plugin`
- Repo: https://github.com/flornkm/dither-plugin
- Docs: https://dither.floriankiem.com/

**Behavior**:
- Default state: Normal photo with `border="1"`
- Hover state: Dithered effect activates
- The dithering IS the translation — cursor presence triggers the image crossing into web-native form

**Implementation**:
```html
<div class="photo-container">
  <img src="russell.jpg" alt="russell" border="1">
</div>
```

```css
.photo-container:hover {
  @apply dither; /* or dither-lg, dither-xl for intensity */
}
```

**Note**: Plugin uses `::after` pseudo-elements, so dither class goes on wrapper div, not `<img>` directly.

### Positioning

- Content floats above the ASCII ocean (z-index layering)
- Centered or left-aligned, your call
- Should feel like it's standing IN the ocean, not pasted on top

---

## Layer 3: ASCII Fish Navigation

### Concept

Portfolio projects exist as living creatures swimming through the ocean. They're not a menu — they're discoverable. Visitors don't browse the portfolio, they encounter it.

### Fish Rendering

- Pure ASCII characters on canvas
- Each fish is a clickable entity with position, velocity, behavior
- Rendered above the ocean layer, below or around the HTML content

### Fish Character Designs

```
><(((°>     -- Standard fish (facing right)
<°)))><     -- Standard fish (facing left)
><(((*>     -- Variant (sparkle eye)
><>         -- Small fish (for smaller projects/posts)
<><         -- Small fish (facing left)
```

### Data Structure

```typescript
interface Fish {
  id: string;
  name: string;           // "AST Visualizer"
  url: string;            // "/projects/ast" or external URL
  characters: string;     // "><(((°>"
  speed: number;          // pixels per frame
  depth: number;          // z-index / opacity tier
  behavior: 'solo' | 'curious' | 'shy';
  color?: string;         // optional tint
}

// Example project fish
const fish: Fish[] = [
  {
    id: 'ast-viz',
    name: 'AST Visualizer',
    url: '/projects/ast',
    characters: '><(((°>',
    speed: 2,
    depth: 1,
    behavior: 'curious'
  },
  {
    id: 'dither-tool',
    name: 'Dithering Playground',
    url: '/projects/dither',
    characters: '><(((*>',
    speed: 1.5,
    depth: 2,
    behavior: 'solo'
  }
];
```

### Behavior System

**Base Movement**:
- Swim left-to-right or right-to-left
- Slight vertical sine-wave wobble
- Exit one edge, re-enter from opposite edge

**Behavior Variants**:
- `solo`: Ignores cursor, just swims
- `curious`: Attracted to cursor, approaches slowly
- `shy`: Avoids cursor, speeds up when cursor near

**Optional Enhancements**:
- Schooling (simplified boids — fish loosely follow each other)
- Depth/parallax (background fish slower and fainter)

### Interaction

**Hover**:
- Fish slows down or pauses
- Project name appears nearby (as ASCII text or minimal tooltip)
- Subtle highlight or color shift

**Click**:
- Navigate to project URL
- Optional: small splash/ripple animation at click point

### Spawn Rules

- 3-5 fish visible at any time (not crowded)
- Fish enter from edges at random intervals
- Which fish appear can be randomized per visit
- At least one fish always visible after initial load

---

## Layer 4: Audio (Optional but Encouraged)

### Concept

The ambient soundscape of being online from an island. Surf that sounds like static. Dial-up tones that sound like bird calls. Not a soundtrack — an environment.

### Ambient Base

- Brown noise / pink noise foundation
- The sound of surf that's also the sound of transmission
- Low, continuous, non-intrusive
- Fades in gently on page load

### Accent Sounds

- Occasional chirps/blips
- Dial-up modem tones processed to sound organic
- Bird calls processed to sound digital
- Sparse — punctuation, not melody
- Triggered randomly or by interaction

### Controls

- **Audio OFF by default** (respectful)
- Visible toggle somewhere unobtrusive
- Remember preference in localStorage
- Visual indicator when audio is playing

### Implementation

- Web Audio API for generation/mixing
- Could be pre-recorded loops or procedurally generated
- Keep file sizes small

---

## Technical Stack

### Recommended

- **Framework**: Vanilla TypeScript or lightweight (Vite + vanilla)
- **Rendering**: Canvas API for ASCII layers
- **Video**: HTML5 `<video>` element (hidden) as source
- **Audio**: Web Audio API
- **Build**: Vite (fast, minimal config)

### File Structure (Suggested)

```
/src
  /ocean
    video-to-ascii.ts     # aalib integration
    color-mapping.ts      # gradient/color logic
    cursor-ripple.ts      # interaction effects
  /fish
    fish-types.ts         # fish data and configs
    fish-renderer.ts      # drawing fish to canvas
    fish-behavior.ts      # movement and AI
  /audio
    ambient.ts            # brown noise / base layer
    chirps.ts             # accent sounds
    mixer.ts              # audio control
  /content
    index.html            # the raw HTML layer
  main.ts                 # orchestration
  style.css               # minimal, mostly for positioning
/public
  /assets
    waves.mp4             # source footage
    russell.jpg           # photo
```

### Key Dependencies

```json
{
  "dependencies": {
    "aalib.js": "latest",
    "dither-plugin": "latest"
  },
  "devDependencies": {
    "vite": "latest",
    "typescript": "latest"
  }
}
```

---

## Visual Reference / Vibe

**These aren't to copy — they're tuning forks:**

- **jodi.org** — hostile, alive, web-native (too hostile, but the energy)
- **poolside.fm** — ambient, persistent, you hang out there (too polished, but the "place" feeling)
- **Old web directories** — unstyled HTML as actual interface
- **Terminal screensavers** — ASCII art that breathes
- **The actual experience of being online from a Pacific island in 2005**

---

## Open Questions / Decisions to Make

1. **Video source**: Do you have Guam footage, or should we find stock/CC beach loops?

2. **Fish behavior complexity**: Start simple (just swimming) or implement curiosity/shyness from the start?

3. **Mobile**: 
   - Does the ASCII ocean run on mobile? 
   - Simplified version? 
   - Static fallback?
   - Touch interaction for fish?

4. **Audio**: Include from v1, or add later?

5. **Time-based variations**: Should colors shift based on actual time of day? (sunset mode, night mode?)

6. **Easter eggs**: Hidden interactions? Konami code? Click sequences?

7. **Loading state**: What shows while video/ASCII initializes? Black? Static? A single `~`?

---

## Implementation Order (Suggested)

### Phase 1: Foundation
1. Set up Vite + TypeScript project
2. Get video-to-ASCII rendering working (aalib.js + test video)
3. Apply color mapping to ASCII output
4. Basic cursor interaction (ripples)

### Phase 2: Content
5. Add HTML content layer with proper z-indexing
6. Style as raw HTML (remove all styling)
7. Implement photo hover-to-dither effect

### Phase 3: Fish
8. Create fish rendering system
9. Basic fish movement (swim across screen)
10. Fish hover/click interaction
11. Project data integration

### Phase 4: Polish
12. Audio layer (if doing)
13. Mobile handling
14. Performance optimization
15. Loading states
16. Easter eggs

---

## The Energy

This isn't a portfolio site. It's a place that exists. The ocean was here before the visitor arrived and will be here after they leave. The fish don't care about being clicked — they're just living. The HTML content is you, standing in this space, present and unadorned.

The message: **I've always been here. I've never left. This is native ground.**

---

*End of spec. Go build it.*
