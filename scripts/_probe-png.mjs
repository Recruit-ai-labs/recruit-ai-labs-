// throwaway probe: does the nav mark have real transparency, and what ink is it?
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const file = process.argv[2] ?? "public/logo-source.png";
const buf = readFileSync(file);

let off = 8;
const idat = [];
let w = 0, h = 0, bd = 0, ct = 0;
while (off < buf.length) {
  const len = buf.readUInt32BE(off);
  const type = buf.toString("ascii", off + 4, off + 8);
  if (type === "IHDR") {
    w = buf.readUInt32BE(off + 8);
    h = buf.readUInt32BE(off + 12);
    bd = buf[off + 16];
    ct = buf[off + 17];
  }
  if (type === "IDAT") idat.push(buf.subarray(off + 8, off + 8 + len));
  if (type === "IEND") break;
  off += 12 + len;
}

const raw = inflateSync(Buffer.concat(idat));
const ch = ct === 6 ? 4 : ct === 2 ? 3 : 1;
const bpp = (ch * bd) / 8;
const stride = w * bpp;
const out = Buffer.alloc(h * stride);
let p = 0;
for (let y = 0; y < h; y++) {
  const f = raw[p++];
  for (let x = 0; x < stride; x++) out[y * stride + x] = raw[p + x];
  for (let x = 0; x < stride; x++) {
    const cur = raw[p + x];
    const a = x >= bpp ? out[y * stride + x - bpp] : 0;
    const bv = y > 0 ? out[(y - 1) * stride + x] : 0;
    const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
    let v;
    if (f === 0) v = cur;
    else if (f === 1) v = cur + (a >> 1);
    else if (f === 2) v = cur + (bv >> 1);
    else if (f === 3) v = cur + ((a + bv) >> 1);
    else {
      const pa = Math.abs(a - bv), pb = Math.abs(a - c), pc = Math.abs(bv - c);
      v = cur + (pa <= pb && pa <= pc ? a : pb <= pc ? bv : c);
    }
    out[y * stride + x] = v & 0xff;
  }
  p += stride;
}

const at = (x, y) => {
  const i = y * stride + x * bpp;
  return ct === 6
    ? [out[i], out[i + 1], out[i + 2], out[i + 3]]
    : [out[i], out[i + 1], out[i + 2], 255];
};

let clear = 0, solid = 0, minLum = 999, maxLum = -1;
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++) {
    const [r, g, b, a] = at(x, y);
    if (a === 0) clear++;
    else {
      solid++;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      minLum = Math.min(minLum, lum);
      maxLum = Math.max(maxLum, lum);
    }
  }

console.log(JSON.stringify({
  file, w, h, bitDepth: bd, colorType: ct,
  transparentPixels: clear, opaquePixels: solid, total: w * h,
  opaqueLumRange: [Math.round(minLum), Math.round(maxLum)],
  corners: [at(0, 0), at(w - 1, h - 1), at((w / 2) | 0, (h / 2) | 0)],
}));
