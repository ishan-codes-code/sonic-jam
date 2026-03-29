# Design System Strategy: The Sonic Ethereal

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Sonic Ethereal."** 

Unlike traditional music streaming interfaces that rely on rigid grids and harsh dividers, this system treats the UI as a fluid, living environment. We are moving away from the "app-as-a-utility" feel toward an "app-as-an-atmosphere" experience. By utilizing intentional asymmetry, overlapping glass surfaces, and a high-contrast typography scale, we create a sense of discovery that feels premium and curated. 

The layout should breathe. We prioritize "white space" (or rather, "dark space") to allow album art and typography to command the user’s full attention.

---

## 2. Colors & Atmospheric Depth
Our palette is rooted in the void of deep space, punctuated by high-energy neon pulses.

### The Palette
*   **Backgrounds:** `surface-dim` (#0e0e0e) and `surface-container-lowest` (#000000).
*   **Primary Accents:** `primary` (#c59aff) and `primary-dim` (#9547f7) for a sophisticated royal purple.
*   **Secondary Accents:** `secondary` (#00e3fd) for high-energy neon blue highlights.
*   **Error States:** `error` (#ff6e84) provides a high-contrast coral-red that cuts through the dark theme.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections. Traditional borders clutter the dark-themed aesthetic and feel "cheap." 
*   **The Method:** Separate sections using background shifts. A `surface-container-low` section sitting on a `surface` background creates a clear but soft boundary. 
*   **Exception:** If a boundary is strictly required for accessibility, use a **"Ghost Border"**—an `outline-variant` (#484848) at 15% opacity.

### Glass & Gradient Soul
To ensure the UI feels custom and high-end, leverage **Glassmorphism**. Floating elements (like the "Now Playing" bar or Navigation) should use a semi-transparent `surface-container-high` with a `backdrop-filter: blur(20px)`. 
*   **Signature Gradients:** For CTAs and "Explore" category headers, use a linear gradient from `primary` (#c59aff) to `secondary` (#00e3fd) at a 135-degree angle.

---

## 3. Typography: Editorial Authority
We utilize a high-contrast pairing: **Plus Jakarta Sans** for headlines to provide a modern, wide-set editorial feel, and **Inter** for body text to ensure maximum legibility at small sizes.

*   **Display (Display-LG/MD):** Used for "Explore" headers or artist names in the playback view. These should feel massive and authoritative.
*   **Headlines (Headline-SM/MD):** Used for playlist titles and section headers. 
*   **Body (Body-MD/LG):** Used for descriptions and metadata. Always use `on-surface-variant` (#ababab) for secondary metadata to maintain visual hierarchy.
*   **Labels (Label-MD):** Strictly for navigation and tiny tags.

---

## 4. Elevation & Tonal Layering
In this design system, depth is not "drawn"; it is "felt" through the stacking of surfaces.

### The Layering Principle
Think of the UI as layers of frosted glass. 
1.  **Level 0 (Base):** `surface-container-lowest` (#000000).
2.  **Level 1 (Sections):** `surface-container-low` (#131313) for large content areas.
3.  **Level 2 (Cards):** `surface-container` (#191919) for individual album or track cards.
4.  **Level 3 (Interactive):** `surface-bright` (#2c2c2c) for active states or hover effects.

### Ambient Shadows
Avoid heavy black shadows. When an element floats (e.g., a "Play" button or a Modal), use a diffused shadow with a 24px-32px blur at 8% opacity, tinted with the `primary` color to simulate an ambient neon glow.

---

## 5. Component Logic

### Buttons
*   **Primary:** A gradient fill (`primary` to `secondary`) with `rounded-full` corners. No shadow, but a 2px "inner glow" using a lighter tint of the primary color.
*   **Secondary:** `surface-container-highest` background with white text.
*   **Tertiary:** Transparent background with `primary` text. Use these for low-emphasis actions like "See All."

### The "Discovery" Cards
*   **Style:** No borders. Use `rounded-lg` (2rem) for large category cards and `rounded-md` (1.5rem) for album art.
*   **Content:** Text should be overlaid on the bottom 30% of the image using a `surface-container-lowest` gradient fade for legibility.

### Input Fields & Search
*   **Style:** Use `surface-container-high` for the field background. 
*   **Focus State:** Instead of a border, the background should shift to `surface-bright` and the leading icon should glow with `secondary` (#00e3fd).

### Lists & Navigation
*   **Forbid Dividers:** Never use a horizontal line to separate tracks in a list. Use `spacing-4` (1rem) of vertical white space or a subtle `surface` shift on alternating rows.
*   **The "Glass" Tab Bar:** The bottom navigation must be a floating element, detached from the bottom of the screen, with `rounded-xl` (3rem) and a high-blur backdrop.

### Dynamic Explore Section
*   **Asymmetry:** Use a "Masonry" grid for the Explore section rather than a standard square grid. Some cards should be double-width to highlight "Featured" content, creating a rhythmic, non-linear browsing experience.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use `rounded-xl` (3rem) for large immersive containers to give a soft, organic feel.
*   **Do** use overlapping elements. Let the album art slightly overlap the header text to create physical depth.
*   **Do** use `secondary` (#00e3fd) sparingly as a "pulse" or "active" indicator (e.g., the current playing track's volume bar).

### Don’t:
*   **Don’t** use pure white (#ffffff) for body text; use `on-surface` (slightly off-white) to reduce eye strain in the dark environment.
*   **Don’t** use shadows on flat surfaces. Shadows are reserved strictly for elements that "float" above the main scroll layer.
*   **Don’t** use standard "Material" ripple effects. Use subtle opacity fades or scale-down (0.98x) transforms for touch feedback to maintain a premium feel.