// ---------------------------------------------------------------------------
//  sketch-logos.mjs — turns the partner marks into pencil drawings.
//
//  The Supported by row no longer sits on cards; the marks rest straight on
//  the paper, so they are redrawn as graphite sketches: line work instead of
//  filled colour, and a transparent sheet instead of their own background.
//  The site's own paper gradient then shows through, the way a drawing on
//  tracing paper would.
//
//  No image library is involved — `sharp` is not in this project, and adding
//  it for a one-off would be heavier than the task. So the script reads and
//  writes PNG itself (zlib is built into Node) and does the drawing by hand:
//
//    1. decode        → RGBA pixels
//    2. luminance     → composite on white, then grey
//    3. auto-level    → stretch the tonal range, so a low-contrast mark
//                       (white type on a pale field) draws as strongly as a
//                       high-contrast one
//    4. pencil        → local contrast, two scales of it: how much darker a
//                       pixel is than its surroundings. That is where a
//                       pencil would go — the rim of every shape, every
//                       stroke of type — while flats stay paper. Each scale
//                       is normalised to its own strongest edge, so a pale
//                       gold ring draws as firmly as black lettering.
//    5. hand          → the pixels are sampled through a slow, wavy
//                       displacement first, so straight rules bend the way a
//                       wrist bends them, and a fine grain breaks up the ink
//                       so no edge is mechanically flat.
//    6. graphite      → the resulting darkness becomes the alpha channel and
//                       every pixel takes the ink colour, so the strokes can
//                       sit on any paper tone.
//
//  Run:  node scripts/sketch-logos.mjs
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync, inflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");

/** The marks the Supported by row shows, and the sketches they become. */
const MARKS = [
	["supported-businessgarh.png", "supported-businessgarh-sketch.png"],
	["supported-SSIPMT.png", "supported-SSIPMT-sketch.png"],
	["supported-raisemoney.png", "supported-raisemoney-sketch.png"],
	["supported-vsntm.png", "supported-vsntm-sketch.png"],
];

/** Graphite, a touch warm against the cool paper the page paints. */
const INK = [34, 35, 39];

/* How the pencil behaves — all measured against the mark's short side, so a
 * small logo and a large one are drawn with the same weight of hand. */
const PEN = {
	denoise: 0.004, // before anything else, a wipe over the flat areas
	bend: 0.0025, // how far a straight rule may wander, in pixels
	peak: 0.99, // the gradient level every mark is normalised to
	base: 30, // never trust a weaker edge than this as the drawing's peak
	noise: 3, // gradient below this is the encoder, not the pen
	pressure: 0.75, // gamma on the stroke, so soft grey keeps its body
	dust: 0.04, // darkness below this is cleared to bare paper
};

/* -------------------------------------------------------------------------
 *  PNG in — signature, IHDR, the IDAT stream, then the five scanline
 *  filters undone one row at a time. Only what this repo actually ships is
 *  accepted: 8-bit, non-interlaced, greyscale or RGB(A).
 * ---------------------------------------------------------------------- */
function readPng(file) {
	const buf = readFileSync(file);
	const signature = [137, 80, 78, 71, 13, 10, 26, 10];
	for (let i = 0; i < signature.length; i++) {
		if (buf[i] !== signature[i]) throw new Error(`${file} is not a PNG`);
	}

	let head = null;
	const idat = [];
	for (let pos = 8; pos < buf.length; ) {
		const length = buf.readUInt32BE(pos);
		const type = buf.toString("ascii", pos + 4, pos + 8);
		const body = buf.subarray(pos + 8, pos + 8 + length);
		if (type === "IHDR") {
			head = {
				width: body.readUInt32BE(0),
				height: body.readUInt32BE(4),
				depth: body[8],
				colorType: body[9],
				interlace: body[12],
			};
		} else if (type === "IDAT") {
			idat.push(body);
		} else if (type === "IEND") {
			break;
		}
		pos += 12 + length;
	}
	if (!head) throw new Error(`${file} has no IHDR`);
	if (head.depth !== 8 || head.interlace !== 0) {
		throw new Error(`${file}: only 8-bit, non-interlaced PNGs are handled`);
	}

	const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[head.colorType];
	if (!channels) throw new Error(`${file}: unsupported colour type`);

	const { width: w, height: h } = head;
	const stride = w * channels;
	const raw = inflateSync(Buffer.concat(idat));
	const rgba = Buffer.alloc(w * h * 4);
	const line = Buffer.alloc(stride);
	const prev = Buffer.alloc(stride);
	let cursor = 0;

	for (let y = 0; y < h; y++) {
		const filter = raw[cursor++];
		raw.copy(line, 0, cursor, cursor + stride);
		cursor += stride;

		for (let i = 0; i < stride; i++) {
			const left = i >= channels ? line[i - channels] : 0;
			const up = prev[i];
			const corner = i >= channels ? prev[i - channels] : 0;
			switch (filter) {
				case 0:
					break;
				case 1:
					line[i] = (line[i] + left) & 255;
					break;
				case 2:
					line[i] = (line[i] + up) & 255;
					break;
				case 3:
					line[i] = (line[i] + ((left + up) >> 1)) & 255;
					break;
				case 4: {
					const p = left + up - corner;
					const pa = Math.abs(p - left);
					const pb = Math.abs(p - up);
					const pc = Math.abs(p - corner);
					const pick = pa <= pb && pa <= pc ? left : pb <= pc ? up : corner;
					line[i] = (line[i] + pick) & 255;
					break;
				}
				default:
					throw new Error(`${file}: unknown scanline filter ${filter}`);
			}
		}

		for (let x = 0; x < w; x++) {
			const src = x * channels;
			const dst = (y * w + x) * 4;
			if (channels === 1) {
				rgba[dst] = rgba[dst + 1] = rgba[dst + 2] = line[src];
				rgba[dst + 3] = 255;
			} else if (channels === 2) {
				rgba[dst] = rgba[dst + 1] = rgba[dst + 2] = line[src];
				rgba[dst + 3] = line[src + 1];
			} else if (channels === 3) {
				rgba[dst] = line[src];
				rgba[dst + 1] = line[src + 1];
				rgba[dst + 2] = line[src + 2];
				rgba[dst + 3] = 255;
			} else {
				rgba[dst] = line[src];
				rgba[dst + 1] = line[src + 1];
				rgba[dst + 2] = line[src + 2];
				rgba[dst + 3] = line[src + 3];
			}
		}

		line.copy(prev);
	}

	return { w, h, rgba };
}

/* -------------------------------------------------------------------------
 *  PNG out — one IDAT, filter 0 on every row. The result is mostly empty
 *  alpha, which deflates to almost nothing anyway, so a cleverer filter
 *  would buy bytes the browser never notices.
 * ---------------------------------------------------------------------- */
const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		table[n] = c >>> 0;
	}
	return table;
})();

function crc32(buf) {
	let c = 0xffffffff;
	for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
	const sum = Buffer.alloc(4);
	sum.writeUInt32BE(crc32(body));
	return Buffer.concat([length, body, sum]);
}

function writePng(file, w, h, rgba) {
	const stride = w * 4;
	const raw = Buffer.alloc((stride + 1) * h);
	for (let y = 0; y < h; y++) {
		raw[y * (stride + 1)] = 0;
		rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
	}

	const header = Buffer.alloc(13);
	header.writeUInt32BE(w, 0);
	header.writeUInt32BE(h, 4);
	header[8] = 8; // bit depth
	header[9] = 6; // RGBA
	header[10] = 0;
	header[11] = 0;
	header[12] = 0;

	writeFileSync(
		file,
		Buffer.concat([
			Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
			chunk("IHDR", header),
			chunk("IDAT", deflateSync(raw, { level: 9 })),
			chunk("IEND", Buffer.alloc(0)),
		]),
	);
}

/* -------------------------------------------------------------------------
 *  Tone — grey, then stretched. A mark whose whole range lives between, say,
 *  200 and 255 would otherwise draw as a ghost: the dodge below only knows
 *  relative contrast, so the range is spread across the full scale first.
 * ---------------------------------------------------------------------- */
function toLuma({ w, h, rgba }) {
	const lum = new Float32Array(w * h);
	for (let i = 0, j = 0; i < lum.length; i++, j += 4) {
		// transparent padding is composited on white, never left to darken
		const a = rgba[j + 3] / 255;
		const r = rgba[j] * a + 255 * (1 - a);
		const g = rgba[j + 1] * a + 255 * (1 - a);
		const b = rgba[j + 2] * a + 255 * (1 - a);
		lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
	}
	return lum;
}

function autoLevel(lum) {
	const hist = new Uint32Array(256);
	for (let i = 0; i < lum.length; i++) hist[Math.max(0, Math.min(255, lum[i] | 0))]++;

	const total = lum.length;
	let low = 0;
	let high = 255;
	let seen = 0;
	for (let v = 0; v < 256; v++) {
		seen += hist[v];
		if (seen >= total * 0.01) {
			low = v;
			break;
		}
	}
	seen = 0;
	for (let v = 255; v >= 0; v--) {
		seen += hist[v];
		if (seen >= total * 0.01) {
			high = v;
			break;
		}
	}
	if (high - low < 8) return lum;

	const scale = 255 / (high - low);
	for (let i = 0; i < lum.length; i++) {
		lum[i] = Math.max(0, Math.min(255, (lum[i] - low) * scale));
	}
	return lum;
}

/* -------------------------------------------------------------------------
 *  Blur — three passes of a box blur, which is close enough to a gaussian
 *  that no eye will tell, and costs one window sum per pixel per axis.
 * ---------------------------------------------------------------------- */
function blurAxis(src, dst, w, h, radius, horizontal) {
	const lines = horizontal ? h : w;
	const length = horizontal ? w : h;
	const step = horizontal ? 1 : w;
	const lineStep = horizontal ? w : 1;

	for (let l = 0; l < lines; l++) {
		const base = l * lineStep;
		for (let i = 0; i < length; i++) {
			let sum = 0;
			let count = 0;
			for (let k = -radius; k <= radius; k++) {
				const j = i + k;
				if (j < 0 || j >= length) continue;
				sum += src[base + j * step];
				count++;
			}
			dst[base + i * step] = sum / count;
		}
	}
}

function blur(src, w, h, radius, passes = 3) {
	let a = Float32Array.from(src);
	let b = new Float32Array(w * h);
	for (let p = 0; p < passes; p++) {
		blurAxis(a, b, w, h, radius, true);
		blurAxis(b, a, w, h, radius, false);
	}
	return a;
}

/* -------------------------------------------------------------------------
 *  The hand — a slow displacement that bends straight rules, and a grain
 *  that keeps the ink from looking stamped.
 * ---------------------------------------------------------------------- */
function wobble(src, w, h, amp) {
	const out = new Float32Array(w * h);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			// two long waves per axis, offset in phase, so the bend never repeats
			// over a short run — a wrist, not a zigzag
			const dx =
				amp *
				(Math.sin(y * 0.045 + 0.9) * 0.6 + Math.sin((x + y) * 0.017 + 2.7) * 0.4);
			const dy =
				amp *
				(Math.sin(x * 0.038 + 4.1) * 0.6 + Math.sin((x - y) * 0.021 + 1.3) * 0.4);
			const sx = Math.max(0, Math.min(w - 1, Math.round(x + dx)));
			const sy = Math.max(0, Math.min(h - 1, Math.round(y + dy)));
			out[y * w + x] = src[sy * w + sx];
		}
	}
	return out;
}

/** Deterministic speckle in [0, 1) — same picture every run. */
function speckle(x, y) {
	let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
	n = Math.imul(n ^ (n >>> 13), 1274126177);
	return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** The value below which this share of the samples sits, in 0–255. */
function percentile(values, share) {
	const bins = new Uint32Array(1024);
	for (let i = 0; i < values.length; i++) {
		bins[Math.max(0, Math.min(1023, (values[i] * 4) | 0))]++;
	}
	const target = values.length * share;
	let seen = 0;
	for (let b = 1023; b >= 0; b--) {
		seen += bins[b];
		if (seen >= target) return (b + 1) / 4;
	}
	return 255;
}

/**
 * Sobel gradient — how fast the tone is turning at each pixel. Unlike a
 * difference against a blurred copy, the answer is a single ridge centred on
 * the edge instead of one line either side of it, which is what keeps a bold
 * letter drawn as an outline rather than a filled blob.
 */
function sobel(src, w, h) {
	const out = new Float32Array(w * h);
	for (let y = 0; y < h; y++) {
		const up = Math.max(0, y - 1) * w;
		const mid = y * w;
		const down = Math.min(h - 1, y + 1) * w;
		for (let x = 0; x < w; x++) {
			const left = Math.max(0, x - 1);
			const right = Math.min(w - 1, x + 1);

			const gx =
				src[up + right] + 2 * src[mid + right] + src[down + right] -
				(src[up + left] + 2 * src[mid + left] + src[down + left]);
			const gy =
				src[down + left] + 2 * src[down + x] + src[down + right] -
				(src[up + left] + 2 * src[up + x] + src[up + right]);

			out[mid + x] = Math.sqrt(gx * gx + gy * gy) / 4;
		}
	}
	return out;
}

/* -------------------------------------------------------------------------
 *  The drawing itself.
 * ---------------------------------------------------------------------- */
function sketch({ w, h, rgba }) {
	const short = Math.min(w, h);

	// the greys, tidied: encoder noise is wiped out before it can ever be
	// mistaken for a line, then the range is stretched
	const grey = blur(
		autoLevel(toLuma({ w, h, rgba })),
		w,
		h,
		Math.max(1, Math.round(short * PEN.denoise)),
		1,
	);

	// the same greys, seen through the hand — one bend for the whole drawing,
	// so every edge shares it and nothing looks individually distorted
	const drawn = wobble(grey, w, h, Math.max(1.2, short * PEN.bend));

	// every edge, one ridge each — the pencil follows the turns in the tone and
	// does not care which side of them is the dark one
	const gradient = sobel(drawn, w, h);

	// normalised to the mark's own strongest edges, so a pale gold ring and
	// black lettering are drawn with the same weight of hand. The percentile
	// sits high on purpose: most pixels of any logo are flat, so a low one
	// would measure the paper, divide by nothing and ink the whole sheet.
	const strong = Math.max(PEN.base, percentile(gradient, PEN.peak));

	let press = new Float32Array(w * h);
	for (let i = 0; i < press.length; i++) {
		press[i] = Math.max(0, Math.min(1, (gradient[i] - PEN.noise) / strong));
	}

	// A ridge barely two pixels wide would vanish once the mark is scaled down
	// to a row of logos, so the stroke is given a little thickness — scaled to
	// the source: a small mark is displayed at nearly its own size and only
	// needs the ridge, a large one is shrunk to a fifth and needs body
	const passes = short >= 700 ? 2 : short >= 480 ? 1 : 0;
	for (let pass = 0; pass < passes; pass++) press = thicken(press, w, h);

	const out = Buffer.alloc(w * h * 4);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = y * w + x;

			// a little grain, then lift the mid-tones so soft pencil grey keeps
			// its pressure, then clear the last haze away
			let d = Math.pow(press[i], PEN.pressure) * (0.9 + 0.1 * speckle(x, y));
			if (d < PEN.dust) d = 0;

			const j = i * 4;
			out[j] = INK[0];
			out[j + 1] = INK[1];
			out[j + 2] = INK[2];
			// five bits of alpha, not eight: the grain would otherwise leave
			// every stroke a different shade and PNG would have to store them
			// all — 32 steps are indistinguishable once the mark is drawn at a
			// hundred pixels tall, and the file shrinks several times over
			out[j + 3] = Math.round(d * 31) * 8;
		}
	}

	return out;
}

/** Pushes each stroke out by a pixel, the way ink bleeds off a nib. */
function thicken(src, w, h) {
	const out = new Float32Array(w * h);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			let best = src[y * w + x];
			for (let oy = -1; oy <= 1; oy++) {
				const yy = y + oy;
				if (yy < 0 || yy >= h) continue;
				for (let ox = -1; ox <= 1; ox++) {
					const xx = x + ox;
					if (xx < 0 || xx >= w) continue;
					if (src[yy * w + xx] > best) best = src[yy * w + xx];
				}
			}
			out[y * w + x] = best;
		}
	}
	return out;
}

/* -------------------------------------------------------------------------
 *  Go.
 * ---------------------------------------------------------------------- */
for (const [from, to] of MARKS) {
	const source = readPng(join(PUBLIC, from));
	const pixels = sketch(source);
	writePng(join(PUBLIC, to), source.w, source.h, pixels);
	console.log(`${from} → ${to}  (${source.w}×${source.h})`);
}
