export class Renderer {
  constructor(canvas, vertexSource, fragmentSource) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: true,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false
    });

    if (!this.gl) throw new Error('WebGL2 is not available in this browser.');

    const gl = this.gl;
    this.program = this.#createProgram(vertexSource, fragmentSource);
    gl.useProgram(this.program);

    this.uniforms = new Map();
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1, -1,  1,
      -1,  1,  1, -1,  1,  1
    ]), gl.STATIC_DRAW);

    const position = gl.getAttribLocation(this.program, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  }

  #compile(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error:
${log}`);
    }
    return shader;
  }

  #createProgram(vsSource, fsSource) {
    const gl = this.gl;
    const vs = this.#compile(gl.VERTEX_SHADER, vsSource);
    const fs = this.#compile(gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program link error:
${log}`);
    }
    return program;
  }

  location(name) {
    if (!this.uniforms.has(name)) {
      this.uniforms.set(name, this.gl.getUniformLocation(this.program, name));
    }
    return this.uniforms.get(name);
  }

  resize() {
    const isCompactTouchDevice = window.matchMedia('(pointer: coarse)').matches || this.canvas.clientWidth <= 720;
    const dprCap = isCompactTouchDevice ? 1.5 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, w, h);
    return { width: w, height: h, dpr };
  }

  render(state) {
    const gl = this.gl;
    const { width, height, dpr } = this.resize();
    const layoutScale = state.layoutScale || 1;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.uniform2f(this.location('uResolution'), width, height);
    gl.uniform1f(this.location('uDpr'), dpr);

    gl.uniform1f(this.location('uIor'), state.glass.refractiveIndex);
    gl.uniform1f(this.location('uRefractionStrength'), state.glass.refractionStrength * layoutScale * dpr);
    gl.uniform1f(this.location('uOpticalBezelScale'), state.glass.opticalBezelScale);
    gl.uniform1f(this.location('uBlurStrength'), state.glass.blurStrength);
    gl.uniform1f(this.location('uBlurRadius'), state.glass.blurRadius * layoutScale * dpr);
    gl.uniform1f(this.location('uDispersion'), state.glass.chromaticDispersion);
    gl.uniform1f(this.location('uGlassTint'), state.glass.glassTint);
    gl.uniform1f(this.location('uRimWidth'), state.glass.rimWidth * layoutScale * dpr);
    gl.uniform1f(this.location('uSpecularStrength'), state.glass.specularStrength);
    gl.uniform1f(this.location('uSpecularSharpness'), state.glass.specularSharpness);
    gl.uniform1f(this.location('uLightAngle'), state.glass.lightAngleDegrees * Math.PI / 180);

    gl.uniform1f(this.location('uValue'), state.value);
    gl.uniform1f(this.location('uSliderActive'), state.sliderActive);
    gl.uniform2f(this.location('uTrackRange'), state.slider.left, state.slider.right);
    gl.uniform1f(this.location('uSliderY'), state.slider.y);
    gl.uniform1f(this.location('uTrackHeight'), state.slider.trackHeight * layoutScale * dpr);
    gl.uniform3fv(this.location('uTrackBlue'), state.slider.blue);
    gl.uniform3fv(this.location('uTrackEmpty'), state.slider.empty);
    gl.uniform2f(this.location('uSliderGlassSize'), state.slider.glassWidth * layoutScale * dpr, state.slider.glassHeight * layoutScale * dpr);
    gl.uniform1f(this.location('uSliderBezelPx'), state.slider.bezel * layoutScale * dpr);

    gl.uniform2f(this.location('uSquareCenter'), state.square.x, state.square.y);
    gl.uniform1f(this.location('uSquareSize'), state.square.size * layoutScale * dpr);
    gl.uniform3fv(this.location('uSquareBlue'), state.square.blue);

    gl.uniform2f(this.location('uRectCenter'), state.rect.x, state.rect.y);
    gl.uniform2f(this.location('uRectSize'), state.rect.width * layoutScale * dpr, state.rect.height * layoutScale * dpr);
    gl.uniform3fv(this.location('uRectBlue'), state.rect.blue);

    gl.uniform2f(this.location('uFreeGlassCenter'), state.freeGlass.x * dpr, state.freeGlass.y * dpr);
    gl.uniform2f(this.location('uFreeGlassSize'), state.freeGlass.width * layoutScale * dpr, state.freeGlass.height * layoutScale * dpr);
    gl.uniform1f(this.location('uFreeBezelPx'), state.freeGlass.bezel * layoutScale * dpr);

    gl.uniform2f(this.location('uBallCenter'), state.ball.x * dpr, state.ball.y * dpr);
    gl.uniform1f(this.location('uBallDiameter'), state.ball.diameter * layoutScale * dpr);
    gl.uniform1f(this.location('uBallBezelPx'), state.ball.bezel * layoutScale * dpr);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}
