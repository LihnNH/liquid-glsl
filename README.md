# Liquid Glass Slider Study

A small WebGL2 study focused on building a believable Liquid Glass slider and a couple of draggable glass shapes.

## What is inside

- A horizontal slider with:
  - inactive white thumb
  - active Liquid Glass thumb
  - 275 ms press / release transition
  - slight lift / scale-up on press
- A draggable glass pill
- A draggable glass ball
- A blue square and a blue rectangle for hard-edge refraction tests
- A control panel with native HTML range sliders for the main optical parameters

## Run

Requirements:

- Python 3.10+ (older versions will probably work too)
- A browser with WebGL2 support

Start the local server:

```bash
python app.py
```

The script starts at port `5173` and automatically tries `5174`, `5175`, and so on until it finds a free port. It then opens the browser automatically.

## Project structure

```text
liquid-glass-slider-study/
├── app.py
├── index.html
├── README.md
└── src/
    ├── config.js
    ├── main.js
    ├── styles.css
    ├── gl/
    │   ├── Renderer.js
    │   └── ShaderLoader.js
    ├── slider/
    │   └── InputController.js
    ├── ui/
    │   └── ControlsPanel.js
    └── shaders/
        ├── common.glsl
        ├── sdf.glsl
        ├── surface.glsl
        ├── refraction.glsl
        ├── lighting.glsl
        ├── slider.frag.glsl
        └── vertex.glsl
```

## Notes

- The shader comments are in English.
- The project now uses `app.py` instead of the old batch / Node launcher files.
- The UI text is in English.
- The current version avoids fake blue spectral edge paint. Blue should mainly appear when actual blue content is under or near the refractive border.
- The slider thumb uses a dedicated wrap pass so the top rim can carry the blue fill more clearly than the generic pill renderer.


## V16 changes

- Updated the default values to the latest tuned values from the UI screenshot.
- Removed stray blue / cyan speckles by gating RGB dispersion with local chroma support.
- Reworked slider wrap so it is limited to top/bottom rim normals instead of leaking into side crescents.
- Added a blue-affinity gate so slider wrap only appears when the sampled track content is actually blue.
- Increased the fully-active top wrap visibility without changing the 275 ms activation transition.


## Update V17

- The active slider thumb now uses the exact same clean glass renderer as the draggable pill again.
- Tightened the RGB-dispersion support test so random blue specks and short blue streaks on neutral glass are much less likely to appear.


## Update V18

- Default refraction is now `64`.
- Replaced the pill SDF finite-difference normal with a stable analytic capsule normal. This targets the tiny blue dots / short blue streak artifacts directly rather than treating them as only an RGB-dispersion problem.
- The refraction reach cap now scales with the Refraction value, so values around 64-65 visibly increase edge carry instead of saturating too early.
- The active slider still uses the exact same glass renderer as the draggable pill. The only slider-specific change is the blue track source position underneath the thumb, which now gives the lens enough blue content to refract and wrap at the rim.


## Update V19

- Default refraction is now `75`.
- All three slider wrap controls now start at their UI maximums: top `2.40`, bottom `2.40`, mix `1.50`.
- The active slider thumb still uses the exact same glass renderer as the draggable pill.
- Increased the hidden blue fill advance under the slider thumb so higher refraction values have enough blue content to produce the same visible edge carry as the free pill.
- Added a general anti-artifact scene sampler used by refraction and blur, not only RGB dispersion. It suppresses isolated one-pixel color jumps that were causing the persistent blue freckles/streaks.

## Update V20

V19 introduced an over-expensive anti-artifact sampler: each glass pixel could trigger dozens of scene samples, and the blur path multiplied that cost again. On a full-screen WebGL canvas this could stall the entire browser/GPU.

V20 keeps the V19 visual/default settings (including Refraction 75 and maximum wrap controls), but restores the lightweight V18 sampling path. This removes the nested multi-sample cleanup pass that caused the freeze.

## Update V21

- Removed the blue freckles and thin blue bar that could appear when a strongly refracted ray barely reached the slider, square, or rectangle.
- Restored the original strong V21 refraction curve instead of blending it with the undeformed scene, so the characteristic liquid-glass bend remains intact without the inward double silhouette or shimmer.
- Added a lightweight radial fold/outlier detector. Two neighboring refracted rays act as continuity votes, and a component-wise median replaces only the collapsed ray that produces a one-pixel streak or freckle.
- Kept the expensive dispersion and blur kernels on the center ray only; the two continuity votes each use one scene lookup, avoiding the V19 performance regression.
- Applied the same localized stabilization to the active slider thumb, draggable pill, and draggable ball.
