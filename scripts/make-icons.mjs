// Draws the app icons (a shield on a dark ground) as PNG files in public/.
// Run: npm run icons. No dependencies: PNG written by hand with zlib.

import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BACKGROUND = [27, 26, 23];
const SHIELD = [138, 44, 29];
const EDGE = [216, 115, 95];

// Is (x, y), both 0..1, inside a heater shield?
function inShield(x, y, inset) {
  const left = 0.22 + inset, right = 0.78 - inset, top = 0.18 + inset, bottom = 0.86 - inset;
  if (y < top || y > bottom || x < left || x > right) return false;
  const shoulder = top + (bottom - top) * 0.45;
  if (y <= shoulder) return true;
  // Below the shoulder the sides curve in to a point at the bottom centre.
  const t = (y - shoulder) / (bottom - shoulder);
  const halfWidth = ((right - left) / 2) * Math.sqrt(Math.max(0, 1 - t * t));
  return Math.abs(x - 0.5) <= halfWidth;
}

function pixel(x, y) {
  if (inShield(x, y, 0.035)) return SHIELD;
  if (inShield(x, y, 0)) return EDGE;
  return BACKGROUND;
}

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) {
      // 2x2 supersampling for smooth edges
      let r = 0, g = 0, b = 0;
      for (const [dx, dy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        const [pr, pg, pb] = pixel((x + dx) / size, (y + dy) / size);
        r += pr; g += pg; b += pb;
      }
      row[1 + x * 3] = r / 4; row[2 + x * 3] = g / 4; row[3 + x * 3] = b / 4;
    }
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [180, 192, 512]) {
  writeFileSync(`public/icon-${size}.png`, png(size));
  console.log(`wrote public/icon-${size}.png`);
}
