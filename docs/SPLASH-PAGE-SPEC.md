# CLAUDE.md — Splash Page for Russell

## Project Overview

A single-page personal website serving as Russell's "home on the internet." The site functions as a professional introduction and portfolio gateway, but the experience should feel like arriving somewhere—specifically, like looking down at the shoreline of Guam.

**Tech Stack**: Vite + React + TypeScript, deployed on Vercel

---

## Design Philosophy: Tasi

The Chamorro word *tasi* means ocean/sea, but it carries more than translation. It's the specific quality of Marianas water—the way light moves through reef shallows, the gradient from white sand to aquamarine to deep blue where the reef shelf drops off. This isn't generic "tropical beach" theming. It's a specific place rendered as interface.

### Core Visual Concept

Imagine the user is standing at the shore, looking down at where water meets sand. The viewport is that liminal space:

- **Upper region**: Where tasi dominates—light aquamarine, turquoise, hints of deeper blue
- **Lower region**: Where sand texture emerges through shallow water
- **The transition**: Not a hard line but a living boundary—water washing over sand, retreating, the interference patterns of light through moving water

### Color Palette (derived from reference image)

```css
:root {
  /* Tasi spectrum - the reef gradient */
  --tasi-shallow: #7FDBDA;      /* where light hits the sandy bottom */
  --tasi-mid: #48C9B0;          /* the living turquoise of healthy reef */
  --tasi-deep: #1E8F89;         /* where the shelf starts to drop */
  --tasi-abyss: #0D5C55;        /* the suggestion of depth beyond */
  
  /* Sand spectrum */
  --sand-dry: #F5F0E6;          /* above the waterline */
  --sand-wet: #E8DFD0;          /* where waves reach */
  --sand-submerged: #D4C9B8;    /* visible through shallow water */
  
  /* Accent - the way light breaks on wave crests */
  --foam-white: #FFFFFF;
  --light-scatter: rgba(255, 255, 255, 0.6);
  
  /* Text - readable against both water and sand */
  --text-primary: #1A3A3A;      /* dark enough for sand backgrounds */
  --text-secondary: #2D5454;
  --text-on-deep: #E8F4F4;      /* for any deep water overlays */
}
```

### Typography

Avoid anything too polished or corporate. This is a personal site from someone who builds things and thinks about language. Consider:

- **Display/Heading**: Something with character—slightly organic, maybe with subtle irregularity. Look at fonts like *Fraunces* (with its optical sizing and "wonky" features), *Instrument Serif*, or *Newsreader* (the italic is beautiful). The heading should feel handcrafted, not tech-startup.
  
- **Body**: Clean but warm. *Source Serif 4*, *Literata*, or *Charter* read well and have personality without fighting the display font.

- **Monospace** (for any code/technical links): *JetBrains Mono* or *Fira Code*—functional but still designed.

The "hang loose" emoji (🤙) in the heading is perfect—it's a Guam/Pacific thing, not just generic beach vibes.

---

## Page Structure

### Above the Fold (Hero Section)

### Primary Hero Content
The hero must include foundational identity + navigation:
- Name + title line
- Core story paragraph
- Hero photo
- **Primary social CTAs**
  - Resume (hosted PDF on this site)
  - GitHub
  - LinkedIn
  - X/Twitter

These links are part of the core content layer and must ship early, before any WebGL effects.

**Layout**: Asymmetric two-column on desktop, stacked on mobile.

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   ┌──────────────┐                                      │
│   │              │     hi, i'm russell 🤙               │
│   │    PHOTO     │                                      │
│   │              │     [paragraph story with hidden     │
│   │              │      hyperlinks that reveal on       │
│   └──────────────┘      hover—words glow/shimmer        │
│                         like light catching on water]   │
│                                                         │
│        [ resume ]  [ github ]  [ linkedin ]  [ twitter ]│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Photo treatment**: The image should feel integrated into the water—perhaps a subtle mask that feathers at the edges, or a shape that isn't a perfect rectangle. Consider whether the image itself should have a slight animated shimmer, as if seen through moving water.

**Story hidden links**: Certain words in the paragraph are secretly hyperlinks. On hover, they reveal themselves—perhaps the text gains a subtle glow, or an underline ripples in like a wave, or the word briefly shimmers. This rewards exploration. Don't make it obvious which words are links until hover.

**Social links**: Styled as minimal icons or text, perhaps with a subtle "bob" animation like they're floating on water. On hover, a small ripple emanates from them.

### Resume Hosting
The resume is a linked PDF hosted on the site.

Implementation note:
- Place at `public/resume/russell-pasetes-resume.pdf` (or similar stable path).
- Link from the hero CTA.
- Use a stable filename for sharing.
- Consider versioning by query string or secondary path if needed:
  - `/resume/russell-pasetes-resume.pdf?v=2025-12`

### Social Links
- Resume (PDF hosted on-site)
- GitHub: https://github.com/rpasetes
- LinkedIn: https://www.linkedin.com/in/russell-pasetes-065a11160/
- Twitter: https://twitter.com/rslantonie

### Below the Fold (Portfolio Section)

Scrolling down reveals the portfolio—the "deeper water" where the actual work lives. This section should feel like you're diving below the surface.

Possible treatments:
- The water effect intensifies slightly
- Project cards could be styled like looking through water at objects on the reef
- Or the opposite: the portfolio section surfaces from the water, projects sitting like islands

---

## Interactive Effects

### Cursor Fluid Dynamics

The primary differentiator. As the cursor moves, it should create subtle disturbances in the water layer:

**Implementation approach**: WebGL shader (via Three.js or raw WebGL) or high-performance canvas. The effect layer sits over the page content with `pointer-events: none`.

**Movement behavior**:
- Cursor creates gentle ripples that propagate outward
- Ripples interact with the underlying color gradient
- Movement speed affects ripple intensity—slow movement = gentle disturbance, fast movement = more pronounced wake
- Ripples should have realistic decay—they spread, diminish, and eventually dissipate

**Click behavior**:
- Click triggers a "splash" effect—more pronounced ripple burst
- Could include brief particle effects (water droplets that arc and fall)
- Perhaps a subtle sound effect (if audio is enabled)

**Performance considerations**:
- Debounce/throttle events appropriately
- Use `requestAnimationFrame` for smooth animation
- Consider reducing effect complexity on mobile or low-power devices
- Provide a way to disable effects for accessibility/preference

### Ambient Fish

Rare, delightful easter eggs. Small fish (or other reef creatures—maybe a sea turtle occasionally) swim across the viewport.

**Implementation notes**:
- Spawn infrequently—this should be a "did I just see that?" moment
- Fish should follow natural swimming patterns (Bézier curves, slight randomness)
- They react to cursor proximity—swim away if you get too close
- Maybe 2-3 species with different behaviors and frequencies
- A school appearing should be *rare*—maybe once every few minutes of page presence

### Audio Layer (Optional, User-Initiated)

**Important**: Audio should NEVER autoplay. Include a subtle audio toggle—perhaps a small wave icon in the corner.

When enabled:
- Gentle wave sounds (looping, ambient)
- Soft underwater ambience
- The splash effects could have corresponding subtle sound
- Keep volume low and peaceful—this is ambient, not soundtrack

**Implementation**: Use Web Audio API. Preload but don't play until user interaction. Consider using Tone.js for more sophisticated audio control.

---

## Technical Architecture

### File Structure

```
splash-page/
├── public/
│   ├── audio/
│   │   ├── waves-ambient.mp3
│   │   └── splash.mp3
│   ├── images/
│   │   ├── russell.jpg
│   │   └── fish-sprites/
│   └── fonts/
├── src/
│   ├── components/
│   │   ├── Hero/
│   │   │   ├── Hero.tsx
│   │   │   ├── Photo.tsx
│   │   │   ├── Story.tsx          # handles hidden link reveals
│   │   │   └── SocialLinks.tsx
│   │   ├── Portfolio/
│   │   │   ├── Portfolio.tsx
│   │   │   └── ProjectCard.tsx
│   │   ├── Effects/
│   │   │   ├── WaterCanvas.tsx    # main WebGL water effect
│   │   │   ├── Ripple.tsx         # click splash handler
│   │   │   ├── Fish.tsx           # ambient creatures
│   │   │   └── shaders/
│   │   │       ├── water.vert
│   │   │       └── water.frag
│   │   ├── Audio/
│   │   │   ├── AudioProvider.tsx  # context for audio state
│   │   │   └── AudioToggle.tsx
│   │   └── Layout/
│   │       └── SandTexture.tsx    # background treatment
│   ├── hooks/
│   │   ├── useMousePosition.ts
│   │   ├── useWaterSimulation.ts
│   │   └── useAmbientSpawner.ts   # controls fish spawn timing
│   ├── styles/
│   │   ├── variables.css
│   │   ├── typography.css
│   │   └── global.css
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── vercel.json
```

### Key Dependencies

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "three": "^0.160.x",           // for WebGL water effects
    "@react-three/fiber": "^8.x",  // React bindings for Three.js
    "tone": "^14.x",               // audio synthesis/playback
    "framer-motion": "^10.x"       // UI animations (hover states, reveals)
  },
  "devDependencies": {
    "@types/react": "^18.x",
    "@types/three": "^0.160.x",
    "typescript": "^5.x",
    "vite": "^5.x",
    "@vitejs/plugin-react": "^4.x"
  }
}
```

### Water Shader Approach (Practical + Progressive)

The water effect is intentionally **progressive enhancement**.
The site must look complete without WebGL.

#### v1 target: convincing ripple shader
Start with a lightweight ripple/displacement shader that sells the illusion:
- Cursor movement injects small disturbances
- Velocity influences amplitude (slow = subtle, fast = wake)
- Exponential decay + subtle refraction over the reef/sand gradient

This can be implemented as:
- A single full-screen quad in Three.js
- Or raw WebGL for minimal overhead
- Keep uniforms small and update via `requestAnimationFrame`

#### v2 optional: richer "fluid-ish" behavior
Only after v1 is stable:
- Add a simplified height/velocity field approach
- Consider caustic overlays if they’re cheap enough
- Avoid full simulation complexity unless it materially improves feel

#### mobile strategy
Define explicit modes:
- Desktop: full ripple + click splash
- Tablet: reduced resolution / simplified shader
- Phone: static gradient + minimal CSS motion

No "optimize until it works" approach on phones.

#### failure + fallback rules
- If WebGL is unavailable or context is lost:
  - disable effects cleanly
  - fall back to shoreline gradient + sand texture

#### layering
- The effect layer sits over content with `pointer-events: none`
- Content must remain readable and interactive under all states

---

## Accessibility & Performance

### Accessibility
- All interactive elements must be keyboard accessible
- Hidden links in story should be discoverable (aria-label, or the links should be visible on focus too, not just hover)
- Motion preferences respected: `prefers-reduced-motion` disables water effects, fish, etc.
- Audio is opt-in only
- Sufficient color contrast on all text

### Performance
- Lazy-load portfolio section and project images
- Water effects should degrade gracefully on low-power devices
- Consider intersection observer to pause effects when not visible
- Target 60fps on modern devices, accept graceful degradation elsewhere

### Additional Edge Cases
- Hidden links must reveal styling on **keyboard focus** (not hover only)
- On touch devices, consider:
  - showing links normally
  - or using a lighter “discoverability” cue
- Cap devicePixelRatio for effects on high-DPI screens
- Debounce resize + avoid layout shift from late-loading assets
- Pause effects when:
  - tab is hidden
  - hero is offscreen
- Audio must handle:
  - iOS user-gesture requirements
  - resume() promise rejections gracefully

---

## Implementation Phases (Re-ordered for Early Real Content)

### Phase 1: Foundation
- Vite + React + TypeScript scaffold
- CSS variables and typography
- Project file structure
- Vercel deployment + preview builds

### Phase 2: Real Content + Core Layout
- Static layout (hero + placeholder portfolio)
- Integrate actual hero photo asset (`russell.jpeg`)
- Implement the real story with hidden links mapped
- Add social links (resume/github/linkedin/x)
- Ensure keyboard + focus-visible behaviors for hidden links

> Goal: the site should already feel like *your* site here, even with zero WebGL.

### Phase 3: Base Visual Polish
- Sand texture background + shoreline gradient
- Photo treatment (mask/feathered edge as progressive enhancement)
- Subtle motion for UI elements (respect reduced motion)
- Responsive refinements

### Phase 4: Effects Gating Framework
- Central feature flags for:
  - `prefers-reduced-motion`
  - device class (desktop/tablet/phone)
  - low-power heuristics
- Lazy-load effects bundle

### Phase 5: Water Effects (Start Simple)
- Fullscreen overlay with `pointer-events: none`
- **Convincing ripple shader** on cursor movement
- Click "splash" burst
- Performance stabilization

### Phase 6: Ambient Life
- Fish spawning system
- Natural swim paths + cursor avoidance
- Rarity/timing controls

### Phase 7: Audio (Optional, User-Initiated)
- Audio context + toggle UI
- Gentle wave ambience loop
- Splash sound hooks

### Phase 8: Portfolio Expansion
- Project data structure
- Card design + lazy images
- Scroll-triggered reveals
- Optional deep-water visual transition


---

## Open Questions

1. **Photo style**: Do you have a specific photo in mind? The treatment will depend on the photo's existing colors and composition.

2. **Portfolio content**: What projects will populate the portfolio section initially? This affects card design.

3. **Hidden link destinations**: What words in your story will secretly link out, and to where? This is a fun opportunity to embed meaning.

4. **Fish species**: Any specific Chamorro reef fish you'd want represented? Palakse' (parrotfish)? Sesyon (surgeonfish)? Could be a nice detail.

5. **Mobile approach**: Full water effects or simplified for mobile? The shader work might be intensive on phones.

---

## Aesthetic Reminders

When building, keep returning to the source:

- This is *tasi*, not generic ocean
- The reef gradient is alive—it shifts with depth and light
- Sand texture should feel real, slightly gritty
- Movement should be organic—waves don't move linearly
- The rarity of the fish is what makes them delightful
- Restraint with effects; the water is ambient, not overwhelming
- The hidden links are gifts for the curious

The goal: someone visits your site and for a moment, feels like they're standing at the water's edge in Tumon Bay, looking down at where the Pacific meets the land.

---

## The Story (With Hidden Links Mapped)

The paragraph below contains secret hyperlinks. Words/phrases in **bold** are the hidden links—they appear as normal text until hovered, when they reveal themselves with a subtle shimmer/glow effect.

> I've been programming for a while — from a **music tech startup at MIT** to **government software** on the **beautiful island territory** of **Guam**, where I leveraged large language models before most people trusted them. But I kept hitting the same wall: the folks back home couldn't hear the wave that was coming, and I didn't have the words to explain why. So I traveled the world to figure that out — studying the **invention**, **inheritance**, and **integrity** of language itself. Eventually arrived at the **Fractal Bootcamp** in Williamsburg, NYC to stop theorizing and start building. I'm looking to work with people who are surfing what's already here by crafting tools that help people think more clearly and remember what matters.

### Link Mapping

| Hidden Text | Destination |
|-------------|-------------|
| music tech startup at MIT | https://betterworld.mit.edu/meet-the-makers-russell-pasetes-20/ |
| government apps | https://dmrpacific.com/ |
| beautiful island territory | https://www.visitguam.com/about-guam/ |
| Guam | https://www.guampedia.com/ |
| invention | https://www.goodreads.com/book/show/164515.Orality_and_Literacy |
| inheritance | https://www.goodreads.com/book/show/48582.The_Spell_of_the_Sensuous |
| integrity | https://www.goodreads.com/en/book/show/211076323-the-knowledge-gene |
| Fractal Bootcamp | https://fractalbootcamp.com/ |

### Hidden Link Behavior

On hover, the linked text should:
1. Gain a subtle glow (like light catching on water surface)
2. Perhaps shift color slightly toward `--tasi-shallow`
3. An underline could "ripple" in from the left
4. The cursor changes to pointer

On focus (for keyboard nav), same visual treatment applies.

The effect should be subtle enough that you don't immediately know which words are links, but discoverable enough that curious users find them. It rewards attention.

---

## Photo Details

**File**: `russell.jpeg`
**Subject**: Russell with hibiscus flower behind ear, palm tree and Tumon architecture in background
**Lighting**: Golden hour, warm natural light
**Mood**: Relaxed, approachable, distinctly Pacific

### Photo Treatment

The hibiscus and palm in the background already tie this to the tasi theme. Consider:
- A subtle vignette or feathered edge that bleeds into the water effect
- Perhaps a very gentle animated shimmer overlay, as if seen through shallow water
- The photo could have a slightly organic shape—not a harsh rectangle, maybe with one edge that follows a gentle wave curve
- On hover, a very subtle ripple could emanate from the photo

---

*"The ocean doesn't stop at the shore."*
