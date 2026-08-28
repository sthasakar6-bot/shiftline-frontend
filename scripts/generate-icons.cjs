const path = require("path");
const sharp = require("sharp");

async function main() {
  const src = path.join(__dirname, "..", "public", "unnamed.jpg");
  const outDir = path.join(__dirname, "..", "public");

  // Manual crop: tight square centered on the face/shoulders, computed from the
  // 1536x2048 source (face roughly spans y~780-1050, x~650-850).
  const cropSize = 700;
  const left = 400;
  const top = 600;

  for (const size of [192, 512]) {
    await sharp(src)
      .extract({ left, top, width: cropSize, height: cropSize })
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `icon-${size}.png`));
  }

  console.log("Icons generated from photo in", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
