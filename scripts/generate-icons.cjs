const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

function crc32(buf) {
  return zlib.crc32(buf);
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePng(size, [r, g, b]) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = chunk("IHDR", ihdrData);

  // Simple design: solid background with a lighter rounded-ish inset square (letter "S" block approximation)
  const raw = Buffer.alloc(size * (1 + size * 4));
  const margin = Math.round(size * 0.28);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0; // filter type none
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 4;
      const inInset = x > margin && x < size - margin && y > margin && y < size - margin;
      if (inInset) {
        raw[px] = 255;
        raw[px + 1] = 255;
        raw[px + 2] = 255;
      } else {
        raw[px] = r;
        raw[px + 1] = g;
        raw[px + 2] = b;
      }
      raw[px + 3] = 255;
    }
  }

  const idatData = zlib.deflateSync(raw);
  const idat = chunk("IDAT", idatData);
  const iend = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const outDir = path.join(__dirname, "..", "public");
const purple = [109, 40, 217]; // matches --accent

for (const size of [192, 512]) {
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), makePng(size, purple));
}

console.log("Icons generated in", outDir);
