# liquid-glsl

An interactive WebGL2 experiment that recreates a liquid-glass look with GLSL refraction, dispersion, blur, rim lighting, and draggable shapes.

**Live demo:** [lihnh.github.io/liquid-glsl](https://lihnh.github.io/liquid-glsl/)

## Highlights

- Liquid-glass slider with an animated press and release state
- Draggable glass pill and glass ball
- Real-time optical controls for refraction, IOR, blur, dispersion, tint, rim, and lighting
- Responsive layout and touch input for phones and tablets
- Live FPS counter based on frames actually rendered
- No build step and no runtime dependencies

## Run locally

You need Python 3 and a browser with WebGL2 support.

```bash
python app.py
```

The local server starts at `http://localhost:5173`. If that port is busy, it automatically tries the next available port and opens the page in your browser.

You can also use any static file server. Opening `index.html` directly will not work in every browser because the GLSL files are loaded with `fetch`.

## Using the demo

- Drag the top glass thumb horizontally to change the slider value.
- Drag the glass pill and ball around the canvas to inspect refraction over sharp edges.
- Use the control cards below the canvas to tune the shader in real time.
- On a focused canvas, use the arrow keys to move the slider. Hold Shift for larger steps; Home and End jump to the limits.

## GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` publishes the static site whenever a commit reaches `main`. It can also be started manually from the Actions tab.

For the first deployment, open the repository settings on GitHub, go to **Pages**, and set **Source** to **GitHub Actions**. After that, pushes to `main` update the live demo automatically.

## Project structure

```text
liquid-glsl/
|-- .github/workflows/deploy-pages.yml
|-- app.py
|-- index.html
|-- README.md
`-- src/
    |-- config.js
    |-- main.js
    |-- styles.css
    |-- gl/
    |-- shaders/
    |-- slider/
    `-- ui/
```

## Browser support

The demo requires WebGL2 and ES modules. Current Chrome, Edge, Firefox, and Safari releases are recommended. Rendering resolution is capped more aggressively on compact touch devices to reduce GPU load while keeping the effect crisp.

## License

[MIT](./LICENSE)
