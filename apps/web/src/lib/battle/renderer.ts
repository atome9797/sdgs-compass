// 전투 화면(#38)을 그리는 쪽: WebGL 로 그리고, WebGL 을 못 쓰는 브라우저에서는 2D 캔버스로 같은 그림을 그려요(번쩍임 · 물결은 빼고).
// 그림은 내부 해상도 그대로(240×150) 그리고, 화면에는 CSS(image-rendering: pixelated)로 늘려서 칸이 또렷하게 보여요.
import { hexToRgba, type PixelImage } from "./pixels";
import type { DrawItem, TextureKey } from "./scene";

export interface Renderer {
  kind: "webgl" | "2d";
  draw(items: readonly DrawItem[], t: number): void;
  dispose(): void;
}

export type TextureSet = Record<TextureKey, PixelImage>;

const VERT = `
attribute vec2 aPos;
uniform vec2 uRes;
uniform vec4 uRect;
varying vec2 vUV;
void main() {
  vec2 p = uRect.xy + aPos * uRect.zw;
  vec2 clip = (p / uRes) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  vUV = aPos;
}`;

// 물결: 바다 배경에서 수평선 아래의 줄을 시간에 따라 좌우로 1~3칸씩 밀어요(아래로 갈수록 크게)
const FRAG = `
precision mediump float;
uniform sampler2D uTex;
uniform vec2 uTexSize;
uniform vec4 uTint;
uniform float uAlpha;
uniform float uGray;
uniform float uWave;
uniform float uTime;
uniform float uHorizon;
varying vec2 vUV;
void main() {
  vec2 uv = vUV;
  if (uWave > 0.0 && uv.y > uHorizon + 0.02) {
    float row = floor(uv.y * uTexSize.y);
    float depth = (uv.y - uHorizon) / (1.0 - uHorizon);
    float shift = floor(sin(row * 0.55 + uTime * 0.0021) * (0.6 + depth * 2.2) + 0.5);
    uv.x = fract(uv.x + shift / uTexSize.x);
  }
  vec4 c = texture2D(uTex, uv);
  if (c.a < 0.01) discard;
  float g = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  c.rgb = mix(c.rgb, vec3(g * 0.9 + 0.08), uGray);
  c.rgb = mix(c.rgb, uTint.rgb, uTint.a);
  gl_FragColor = vec4(c.rgb, c.a * uAlpha);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function rgb01(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgba(hex);
  return [r / 255, g / 255, b / 255];
}

export function createWebGLRenderer(canvas: HTMLCanvasElement, textures: TextureSet, horizon: number): Renderer | null {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false }) as WebGLRenderingContext | null;
  if (!gl) return null;
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const loc = {
    res: u("uRes"),
    rect: u("uRect"),
    tex: u("uTex"),
    texSize: u("uTexSize"),
    tint: u("uTint"),
    alpha: u("uAlpha"),
    gray: u("uGray"),
    wave: u("uWave"),
    time: u("uTime"),
    horizon: u("uHorizon"),
  };
  gl.uniform2f(loc.res, canvas.width, canvas.height);
  gl.uniform1i(loc.tex, 0);
  gl.uniform1f(loc.horizon, horizon);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.activeTexture(gl.TEXTURE0);

  const made = new Map<TextureKey, { texture: WebGLTexture; w: number; h: number }>();
  for (const [key, image] of Object.entries(textures) as [TextureKey, PixelImage][]) {
    const texture = gl.createTexture();
    if (!texture) return null;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.w, image.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(image.data.buffer, image.data.byteOffset, image.data.byteLength));
    // 크기가 2의 거듭제곱이 아닌 그림이라 가장자리 반복 없이 · 칸을 섞지 않게(NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    made.set(key, { texture, w: image.w, h: image.h });
  }

  let lost = false;
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
  };
  canvas.addEventListener("webglcontextlost", onLost);

  return {
    kind: "webgl",
    draw(items, t) {
      if (lost || gl.isContextLost()) return;
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(loc.time, t);
      for (const item of items) {
        const tex = made.get(item.tex);
        if (!tex) continue;
        gl.bindTexture(gl.TEXTURE_2D, tex.texture);
        gl.uniform2f(loc.texSize, tex.w, tex.h);
        gl.uniform4f(loc.rect, item.x, item.y, item.w, item.h);
        if (item.color) gl.uniform4f(loc.tint, ...rgb01(item.color), 1);
        else gl.uniform4f(loc.tint, 1, 1, 1, item.flash ?? 0);
        gl.uniform1f(loc.alpha, item.alpha ?? 1);
        gl.uniform1f(loc.gray, item.gray ?? 0);
        gl.uniform1f(loc.wave, item.wave ?? 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    },
    dispose() {
      canvas.removeEventListener("webglcontextlost", onLost);
      if (gl.isContextLost()) return;
      for (const { texture } of made.values()) gl.deleteTexture(texture);
      gl.deleteBuffer(quad);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}

/** WebGL 을 못 쓸 때: 같은 그리기 목록을 2D 캔버스로 (투명도 · 점 색만) */
export function create2DRenderer(canvas: HTMLCanvasElement, textures: TextureSet): Renderer | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const sources = new Map<TextureKey, HTMLCanvasElement>();
  for (const [key, image] of Object.entries(textures) as [TextureKey, PixelImage][]) {
    const off = document.createElement("canvas");
    off.width = image.w;
    off.height = image.h;
    const octx = off.getContext("2d");
    if (!octx) return null;
    const data = octx.createImageData(image.w, image.h);
    data.data.set(image.data);
    octx.putImageData(data, 0, 0);
    sources.set(key, off);
  }
  const canFilter = "filter" in ctx;
  return {
    kind: "2d",
    draw(items) {
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const item of items) {
        ctx.globalAlpha = item.alpha ?? 1;
        if (item.color) {
          ctx.fillStyle = item.color;
          ctx.fillRect(item.x, item.y, item.w, item.h);
          continue;
        }
        const source = sources.get(item.tex);
        // 쓰러진 몬스터의 흑백은 캔버스 필터가 되는 브라우저에서만
        if (canFilter) ctx.filter = item.gray ? `grayscale(${item.gray})` : "none";
        if (source) ctx.drawImage(source, item.x, item.y, item.w, item.h);
      }
      if (canFilter) ctx.filter = "none";
      ctx.globalAlpha = 1;
    },
    dispose() {
      sources.clear();
    },
  };
}

export function createRenderer(canvas: HTMLCanvasElement, textures: TextureSet, horizon: number): Renderer | null {
  try {
    return createWebGLRenderer(canvas, textures, horizon) ?? create2DRenderer(canvas, textures);
  } catch {
    return create2DRenderer(canvas, textures);
  }
}
