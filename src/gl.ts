import { CAM_FOV } from './constants';
import { mat4, mul, perspective, trs } from './math';

let gl: WebGLRenderingContext;
let uMvp: WebGLUniformLocation;
let uColor: WebGLUniformLocation;
let aLoc: number;
let boxBuf: WebGLBuffer;
let pyrBuf: WebGLBuffer;
let octBuf: WebGLBuffer;
const mvp = mat4();
const proj = mat4();
const model = mat4();
const tmp = mat4();

function compile(type: number, src: string): WebGLShader {
  const sh = gl.createShader(type) as WebGLShader;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  return sh;
}

function mesh(verts: number[]): WebGLBuffer {
  const buf = gl.createBuffer() as WebGLBuffer;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  return buf;
}

function quad(out: number[], a: number[], b: number[], c: number[], d: number[]): void {
  out.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  out.push(a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2]);
}

function boxVerts(): number[] {
  const p = [
    [-0.5, -0.5, 0.5],
    [0.5, -0.5, 0.5],
    [0.5, 0.5, 0.5],
    [-0.5, 0.5, 0.5],
    [-0.5, -0.5, -0.5],
    [0.5, -0.5, -0.5],
    [0.5, 0.5, -0.5],
    [-0.5, 0.5, -0.5],
  ];
  const out: number[] = [];
  quad(out, p[0], p[1], p[2], p[3]);
  quad(out, p[5], p[4], p[7], p[6]);
  quad(out, p[3], p[2], p[6], p[7]);
  quad(out, p[4], p[5], p[1], p[0]);
  quad(out, p[1], p[5], p[6], p[2]);
  quad(out, p[4], p[0], p[3], p[7]);
  return out;
}

function pyrVerts(): number[] {
  const a = [0, 0.5, 0];
  const b = [-0.5, -0.5, 0.5];
  const c = [0.5, -0.5, 0.5];
  const d = [0.5, -0.5, -0.5];
  const e = [-0.5, -0.5, -0.5];
  const faces = [a, b, c, a, c, d, a, d, e, a, e, b, b, e, d, b, d, c];
  const out: number[] = [];
  for (const v of faces) {
    out.push(v[0], v[1], v[2]);
  }
  return out;
}

function octVerts(): number[] {
  const top = [0, 0.5, 0];
  const bot = [0, -0.5, 0];
  const ring = [
    [0.5, 0, 0],
    [0, 0, 0.5],
    [-0.5, 0, 0],
    [0, 0, -0.5],
  ];
  const out: number[] = [];
  for (let i = 0; i < 4; i++) {
    const a = ring[i];
    const b = ring[(i + 1) & 3];
    out.push(top[0], top[1], top[2], a[0], a[1], a[2], b[0], b[1], b[2]);
    out.push(bot[0], bot[1], bot[2], b[0], b[1], b[2], a[0], a[1], a[2]);
  }
  return out;
}

export function initGl(canvas: HTMLCanvasElement): void {
  gl = canvas.getContext('webgl', { antialias: true }) as WebGLRenderingContext;
  const vs = compile(
    gl.VERTEX_SHADER,
    'attribute vec3 a;uniform mat4 m;void main(){gl_Position=m*vec4(a,1.0);}'
  );
  const fs = compile(
    gl.FRAGMENT_SHADER,
    'precision mediump float;uniform vec3 c;void main(){gl_FragColor=vec4(c,1.0);}'
  );
  const prog = gl.createProgram() as WebGLProgram;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);
  uMvp = gl.getUniformLocation(prog, 'm') as WebGLUniformLocation;
  uColor = gl.getUniformLocation(prog, 'c') as WebGLUniformLocation;
  aLoc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(aLoc);
  boxBuf = mesh(boxVerts());
  pyrBuf = mesh(pyrVerts());
  octBuf = mesh(octVerts());
  gl.enable(gl.DEPTH_TEST);
}

export function resizeGl(w: number, h: number): void {
  gl.viewport(0, 0, w, h);
  perspective(proj, CAM_FOV, w / Math.max(h, 1), 0.2, 220);
}

export function setSky(r: number, g: number, b: number): void {
  gl.clearColor(r, g, b, 1);
}

export function beginFrame(): void {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function bind(buf: WebGLBuffer): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.vertexAttribPointer(aLoc, 3, gl.FLOAT, false, 0, 0);
}

function drawPrim(
  buf: WebGLBuffer,
  count: number,
  view: Float32Array,
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  sx: number,
  sy: number,
  sz: number,
  r: number,
  g: number,
  b: number
): void {
  trs(model, x, y, z, rx, ry, sx, sy, sz);
  mul(tmp, view, model);
  mul(mvp, proj, tmp);
  gl.uniformMatrix4fv(uMvp, false, mvp);
  gl.uniform3f(uColor, r, g, b);
  bind(buf);
  gl.drawArrays(gl.TRIANGLES, 0, count);
}

export function drawBox(
  view: Float32Array,
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  sx: number,
  sy: number,
  sz: number,
  r: number,
  g: number,
  b: number
): void {
  drawPrim(boxBuf, 36, view, x, y, z, rx, ry, sx, sy, sz, r, g, b);
}

export function drawPyr(
  view: Float32Array,
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  sx: number,
  sy: number,
  sz: number,
  r: number,
  g: number,
  b: number
): void {
  drawPrim(pyrBuf, 18, view, x, y, z, rx, ry, sx, sy, sz, r, g, b);
}

export function drawOct(
  view: Float32Array,
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  sx: number,
  sy: number,
  sz: number,
  r: number,
  g: number,
  b: number
): void {
  drawPrim(octBuf, 24, view, x, y, z, rx, ry, sx, sy, sz, r, g, b);
}
