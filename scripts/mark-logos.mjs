// ---------------------------------------------------------------------------
//  mark-logos.mjs — the partner marks, drawn in one ink.
//
//  The Supported by row carries nothing but the marks themselves: no card, no
//  tile, no plate behind them. Each partner's artwork is redrawn as pure ink
//  on transparent paper, the way a printer would set it on the sheet, so the
//  page's own paper shows through the counters of every letterform.
//
//  The four artworks are not the same kind of picture, so one formula would
//  wreck at least one of them. Two rules cover the set:
//
//    · ink    — dark shapes on a light sheet: the maroon tile, the navy disc,
//               the white page of the campus mark. Whatever is dark becomes
//               ink; whatever is light stays a hole, which is what preserves
//               the white counters inside a letterform.
//    · field  — white type sitting in a coloured field (VSNTM). The field is
//               not part of the mark, so the ink is whatever differs from it:
//               the wordmark comes out solid and the mint square disappears.
//
//  `boost` keeps the result two-tone instead of grey. A mark printed in one
//  colour has no room for a half-strength tone: a gold ring left at 55% reads
//  as a smudge next to the lettering it belongs with. `floor` throws away
//  baked-in photo shadows, which a lift would otherwise turn into a halo.
//
//  Alpha carries the whole picture — every pixel is the ink colour, and the
//  paper shows through wherever the artwork had nothing to say.
//
//  No image library: `sharp` is not in this project, and adding it for a
//  one-off would be heavier than the task. The PNG reader and writer below are
//  the same ones the retired sketch script used — 8-bit, non-interlaced,
//  greyscale or RGB(A) in; RGBA out.
//
//  Run:  node scripts/mark-logos.mjs
//        node scripts/mark-logos.mjs --preview   (also writes a contact sheet)
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync, inflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");

/** The site's ink, so a mark and the type around it are the same colour. */
const INK = [10, 10, 12];
/** The site's paper, used only by the contact sheet. */
const PAPER = [243, 244, 246];

/**
 * The marks the Supported by row shows, and the rule that turns each into ink.
 * `field` is the luminance of the coloured field (0–255) and `span` how far a
 * pixel must sit from it before the ink is solid; both are measured from the
 * artwork, not guessed.
 */
const MARKS = [
	// the maroon tile is already dark, so a small lift carries it to solid
	{ from: "supported-businessgarh.png", rule: "ink", boost: 1.25 },
	// the gold ring sits halfway up the scale; without a strong lift it prints
	// as a grey smudge next to the black lettering it belongs with
	{ from: "supported-SSIPMT.png", rule: "ink", boost: 1.9 },
	// the disc was photographed with a soft shadow on white, and that shadow
	// is exactly the tone a lift turns into a grey halo — so the floor is
	// raised here to cut it away and leave the disc's edge crisp
	{ from: "supported-raisemoney.png", rule: "ink", boost: 1.45, floor: 0.32 },
	{ from: "supported-vsntm.png", rule: "field", field: 200, span: 34 },
];

/* -------------------------------------------------------------------------
 *  The two rules, in one place so the numbers can be read together.
 *
 *  gamma   lifts the middle of the ramp so a gold ring or a red slash keeps
 *          its body when the mark is drawn in one weight of ink — a straight
 *          linear ramp leaves those tones at a quarter strength and they
 *          disappear at display size.
 *  floor   anything below this is encoder noise, not artwork; clearing it
 *          keeps the paper free of grey dust around the mark.
 *  soft    a short ramp at the top of the noise so edges antialias instead of
 *          snapping to a hard stencil.
 * ---------------------------------------------------------------------- */
const RULE = {
	ink: { gamma: 0.75, floor: 0.07, soft: 0.05 },
	field: { gamma: 0.9, floor: 0.05, soft: 0.1, near: 7 },
};

/* -------------------------------------------------------------------------
 *  PNG in — signature, IHDR, the IDAT stream, then the five scanline
 *  filters undone one row at a time.
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
 *  PNG out — one IDAT, filter 0 on every row. The image is one flat colour, so
 *  only alpha has to be stored faithfully; the rest deflates to nothing.
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
 *  Tone — grey, with transparent padding composited on paper so it can never
 *  read as ink just because the source happened to be cut out badly.
 * ---------------------------------------------------------------------- */
function toLuma({ w, h, rgba }) {
	const lum = new Float32Array(w * h);
	for (let i = 0, j = 0; i < lum.length; i++, j += 4) {
		const a = rgba[j + 3] / 255;
		const r = rgba[j] * a + 255 * (1 - a);
		const g = rgba[j + 1] * a + 255 * (1 - a);
		const b = rgba[j + 2] * a + 255 * (1 - a);
		lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
	}
	return lum;
}

/** A one-pixel box blur, so a mark's edge lands on a soft step, not a stencil. */
function soften(src, w, h) {
	const out = new Float32Array(w * h);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			let sum = 0;
			let count = 0;
			for (let oy = -1; oy <= 1; oy++) {
				const yy = y + oy;
				if (yy < 0 || yy >= h) continue;
				for (let ox = -1; ox <= 1; ox++) {
					const xx = x + ox;
					if (xx < 0 || xx >= w) continue;
					sum += src[yy * w + xx];
					count++;
				}
			}
			out[y * w + x] = sum / count;
		}
	}
	return out;
}

/**
 * Turns a grey reading into ink coverage in [0, 1].
 *
 * `ink` inverts — a dark pixel is a place the printer put ink, a light one is
 * a hole. `field` measures the distance from the field tone instead, so the
 * white type inside a mint square comes out solid and the square itself comes
 * out empty.
 */
function coverage(lum, mark) {
	const rule = RULE[mark.rule];
	const boost = mark.boost ?? 1;
	const floor = mark.floor ?? rule.floor;
	const out = new Float32Array(lum.length);

	for (let i = 0; i < lum.length; i++) {
		let v;
		if (mark.rule === "field") {
			const distance = Math.abs(lum[i] - mark.field);
			v = Math.max(0, distance - rule.near) / mark.span;
		} else {
			v = (255 - lum[i]) / 255;
		}
		v = Math.min(1, Math.max(0, Math.pow(v, rule.gamma))) * boost;

		// clear the encoder's dust, then let the solid edge step instead of snap
		v = Math.min(1, Math.max(0, v));
		v = (v - floor) / (1 - floor);
		v = Math.min(1, Math.max(0, v));
		out[i] = v < rule.soft ? (v * v) / (2 * rule.soft) : v - rule.soft / 2;
	}
	return out;
}

/**
 * Crops to the mark's own edges.
 *
 * Some of this artwork ships with a wide margin baked into the file — the
 * VSNTM square is mostly empty field with a wordmark in the middle — and once
 * `object-fit: contain` fits that square into a fixed height, its type ends up
 * half the size of the mark beside it. Cropping leaves every column carrying a
 * mark of comparable weight instead of a comparable canvas.
 */
function crop(src, ink, pad) {
	let minX = src.w;
	let minY = src.h;
	let maxX = -1;
	let maxY = -1;

	for (let y = 0; y < src.h; y++) {
		for (let x = 0; x < src.w; x++) {
			if (ink[y * src.w + x] < 0.06) continue;
			if (x < minX) minX = x;
			if (x > maxX) maxX = x;
			if (y < minY) minY = y;
			if (y > maxY) maxY = y;
		}
	}
	if (maxX < 0) return src;

	const left = Math.max(0, minX - pad);
	const top = Math.max(0, minY - pad);
	const w = Math.min(src.w, maxX + pad + 1) - left;
	const h = Math.min(src.h, maxY + pad + 1) - top;

	const rgba = Buffer.alloc(w * h * 4);
	for (let y = 0; y < h; y++) {
		const from = ((top + y) * src.w + left) * 4;
		rgba.set(src.rgba.subarray(from, from + w * 4), y * w * 4);
	}
	return { w, h, rgba };
}

/* -------------------------------------------------------------------------
 *  Go.
 * ---------------------------------------------------------------------- */
const drawn = [];

for (const mark of MARKS) {
	const source = readPng(join(PUBLIC, mark.from));
	const grey = soften(toLuma(source), source.w, source.h);
	const ink = coverage(grey, mark);

	// every pixel carries the ink colour; alpha says whether it is there
	const blank = Buffer.alloc(source.w * source.h * 4);
	for (let i = 0; i < ink.length; i++) {
		const j = i * 4;
		blank[j] = INK[0];
		blank[j + 1] = INK[1];
		blank[j + 2] = INK[2];
		blank[j + 3] = Math.round(ink[i] * 255);
	}

	// a hair of air, proportional to the artwork, so nothing kisses the edge
	const pad = Math.round(Math.max(source.w, source.h) * 0.015);
	const pixels = crop({ w: source.w, h: source.h, rgba: blank }, ink, pad);

	const to = mark.from.replace(/\.png$/, "-ink.png");
	writePng(join(PUBLIC, to), pixels.w, pixels.h, pixels.rgba);
	drawn.push({ to, ...pixels });
	console.log(
		`${mark.from} → ${to}  (${source.w}×${source.h} → ${pixels.w}×${pixels.h}, ${mark.rule})`,
	);
}

/* -------------------------------------------------------------------------
 *  Optional contact sheet — `node scripts/mark-logos.mjs --preview` sets the
 *  marks four across on the page's own paper, so the set can be judged as a
 *  row before it reaches the page. Written next to this script rather than
 *  into public/, because it is a working drawing.
 * ---------------------------------------------------------------------- */
if (process.argv.includes("--preview")) {
	const SLOT = 300;
	const PAD = 48;
	const GAP = 24;
	const width = drawn.length * SLOT + (drawn.length + 1) * GAP;
	const height = SLOT + PAD * 2;
	const sheet = Buffer.alloc(width * height * 4);

	for (let i = 0; i < width * height; i++) {
		sheet[i * 4] = PAPER[0];
		sheet[i * 4 + 1] = PAPER[1];
		sheet[i * 4 + 2] = PAPER[2];
		sheet[i * 4 + 3] = 255;
	}

	drawn.forEach((art, index) => {
		const left = GAP + index * (SLOT + GAP);
		const top = PAD;

		// fitted the way `object-fit: contain` will fit it — one scale for both
		// axes, or a wordmark would arrive stretched and the sheet would be
		// judging a picture the page never shows
		const box = SLOT * 0.66;
		const fit = Math.min(box / art.w, box / art.h);
		const drawW = Math.round(art.w * fit);
		const drawH = Math.round(art.h * fit);
		const offsetX = left + Math.round((SLOT - drawW) / 2);
		const offsetY = top + Math.round((SLOT - drawH) / 2);

		for (let y = 0; y < drawH; y++) {
			for (let x = 0; x < drawW; x++) {
				const sx = Math.min(art.w - 1, Math.floor((x / drawW) * art.w));
				const sy = Math.min(art.h - 1, Math.floor((y / drawH) * art.h));
				const a = art.rgba[(sy * art.w + sx) * 4 + 3] / 255;
				if (a === 0) continue;

				const dst = ((offsetY + y) * width + offsetX + x) * 4;
				for (let c = 0; c < 3; c++) {
					sheet[dst + c] = Math.round(sheet[dst + c] * (1 - a) + INK[c] * a);
				}
			}
		}
	});

	const preview = join(ROOT, "scripts", "mark-preview.png");
	writePng(preview, width, height, sheet);
	console.log(`preview → ${preview}`);
}
