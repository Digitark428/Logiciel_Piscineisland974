import { deflateSync, inflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSET_DIR = join(ROOT, "public", "leti");
const SOURCE = join(ASSET_DIR, "leti-symbol-transparent.png");

const TARGETS = [
  ["app-icon-master-1024.png", 1024],
  ["app-icon-512.png", 512],
  ["app-icon-192.png", 192],
  ["apple-touch-icon.png", 180],
  ["favicon-64.png", 64],
  ["favicon-32.png", 32],
];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length, 0);
  name.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return output;
}

function decodePng(path) {
  const png = readFileSync(path);
  const signature = "89504e470d0a1a0a";
  if (png.subarray(0, 8).toString("hex") !== signature) {
    throw new Error(`${path} is not a PNG file`);
  }

  let offset = 8;
  let width;
  let height;
  let bitDepth;
  let colorType;
  const compressed = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      compressed.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += length + 12;
  }

  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`Expected an 8-bit RGBA source, received depth=${bitDepth} type=${colorType}`);
  }

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const filtered = inflateSync(Buffer.concat(compressed));
  const rgba = new Uint8Array(width * height * bytesPerPixel);

  for (let y = 0; y < height; y += 1) {
    const filter = filtered[y * (stride + 1)];
    const input = y * (stride + 1) + 1;
    const output = y * stride;

    for (let x = 0; x < stride; x += 1) {
      const raw = filtered[input + x];
      const left = x >= bytesPerPixel ? rgba[output + x - bytesPerPixel] : 0;
      const above = y > 0 ? rgba[output + x - stride] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel ? rgba[output + x - stride - bytesPerPixel] : 0;
      let value;

      if (filter === 0) value = raw;
      else if (filter === 1) value = raw + left;
      else if (filter === 2) value = raw + above;
      else if (filter === 3) value = raw + Math.floor((left + above) / 2);
      else if (filter === 4) {
        const estimate = left + above - upperLeft;
        const leftDistance = Math.abs(estimate - left);
        const aboveDistance = Math.abs(estimate - above);
        const diagonalDistance = Math.abs(estimate - upperLeft);
        const predictor = leftDistance <= aboveDistance && leftDistance <= diagonalDistance
          ? left
          : aboveDistance <= diagonalDistance
            ? above
            : upperLeft;
        value = raw + predictor;
      } else {
        throw new Error(`Unsupported PNG filter ${filter}`);
      }

      rgba[output + x] = value & 0xff;
    }
  }

  return { width, height, rgba };
}

function encodePng({ width, height, rgba }) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (stride + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const source = (y * width + x) * 4;
      const target = row + 1 + x * 3;
      raw[target] = rgba[source];
      raw[target + 1] = rgba[source + 1];
      raw[target + 2] = rgba[source + 2];
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function insideRoundedSquare(x, y, left, top, size) {
  const radius = size * 0.2237;
  const right = left + size;
  const bottom = top + size;
  const innerLeft = left + radius;
  const innerRight = right - radius;
  const innerTop = top + radius;
  const innerBottom = bottom - radius;

  if ((x >= innerLeft && x < innerRight) || (y >= innerTop && y < innerBottom)) return true;
  const centerX = x < innerLeft ? innerLeft : innerRight;
  const centerY = y < innerTop ? innerTop : innerBottom;
  return (x - centerX) ** 2 + (y - centerY) ** 2 <= radius ** 2;
}

function createPreview(source, bounds) {
  const width = 900;
  const height = 420;
  const rgba = new Uint8Array(width * height * 4);
  const background = [224, 227, 230];
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const index = pixel * 4;
    rgba[index] = background[0];
    rgba[index + 1] = background[1];
    rgba[index + 2] = background[2];
    rgba[index + 3] = 255;
  }

  const samples = [
    { size: 300, left: 50, top: 60 },
    { size: 180, left: 430, top: 120 },
    { size: 64, left: 700, top: 178 },
    { size: 32, left: 815, top: 194 },
  ];

  for (const sample of samples) {
    const icon = compositeIcon(source, bounds, sample.size);
    for (let y = 0; y < sample.size; y += 1) {
      for (let x = 0; x < sample.size; x += 1) {
        const targetX = sample.left + x;
        const targetY = sample.top + y;
        if (!insideRoundedSquare(targetX + 0.5, targetY + 0.5, sample.left, sample.top, sample.size)) continue;
        const sourceIndex = (y * sample.size + x) * 4;
        const targetIndex = (targetY * width + targetX) * 4;
        rgba[targetIndex] = icon.rgba[sourceIndex];
        rgba[targetIndex + 1] = icon.rgba[sourceIndex + 1];
        rgba[targetIndex + 2] = icon.rgba[sourceIndex + 2];
      }
    }
  }

  return { width, height, rgba };
}

function coloredBounds(image) {
  let left = image.width;
  let top = image.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const index = (y * image.width + x) * 4;
      const red = image.rgba[index] / 255;
      const green = image.rgba[index + 1] / 255;
      const blue = image.rgba[index + 2] / 255;
      const alpha = image.rgba[index + 3] / 255;
      const maximum = Math.max(red, green, blue);
      const minimum = Math.min(red, green, blue);
      const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum;

      if (alpha > 0.05 && saturation > 0.1) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }

  if (right < left || bottom < top) throw new Error("The official symbol has no colored pixels");
  return { left, top, right, bottom };
}

function sinc(value) {
  if (value === 0) return 1;
  const angle = Math.PI * value;
  return Math.sin(angle) / angle;
}

function lanczos(value, radius = 3) {
  const distance = Math.abs(value);
  return distance < radius ? sinc(distance) * sinc(distance / radius) : 0;
}

function contributions(outputSize, sourceSize, scale, outputCenter, sourceCenter) {
  const taps = [];
  for (let coordinate = 0; coordinate < outputSize; coordinate += 1) {
    const sourceCoordinate = (coordinate + 0.5 - outputCenter) / scale + sourceCenter - 0.5;
    const start = Math.ceil(sourceCoordinate - 3);
    const end = Math.floor(sourceCoordinate + 3);
    const entries = [];
    let total = 0;

    for (let source = start; source <= end; source += 1) {
      if (source < 0 || source >= sourceSize) continue;
      const weight = lanczos(sourceCoordinate - source);
      if (weight === 0) continue;
      entries.push([source, weight]);
      total += weight;
    }

    taps.push(total === 0 ? [] : entries.map(([source, weight]) => [source, weight / total]));
  }
  return taps;
}

function renderOfficialLayer(source, bounds, size) {
  // 74% height keeps the tall LETI silhouette present while preserving the iOS safe area.
  const desiredHeight = size * 0.74;
  const coreHeight = bounds.bottom - bounds.top + 1;
  const scale = desiredHeight / coreHeight;
  const sourceCenterX = (bounds.left + bounds.right + 1) / 2;
  const sourceCenterY = (bounds.top + bounds.bottom + 1) / 2;

  // The source canvas is asymmetric. Center the visible silhouette, then use a tiny
  // optical lift and left correction to balance the heavier aqua lower-right area.
  const outputCenterX = size * 0.496;
  const outputCenterY = size * 0.49;
  const horizontal = contributions(size, source.width, scale, outputCenterX, sourceCenterX);
  const vertical = contributions(size, source.height, scale, outputCenterY, sourceCenterY);
  const layer = new Float32Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    if (vertical[y].length === 0) continue;
    for (let x = 0; x < size; x += 1) {
      if (horizontal[x].length === 0) continue;
      let alpha = 0;
      let red = 0;
      let green = 0;
      let blue = 0;

      for (const [sourceY, weightY] of vertical[y]) {
        for (const [sourceX, weightX] of horizontal[x]) {
          const weight = weightX * weightY;
          const sourceIndex = (sourceY * source.width + sourceX) * 4;
          const sourceAlpha = source.rgba[sourceIndex + 3] / 255;
          alpha += sourceAlpha * weight;
          red += (source.rgba[sourceIndex] / 255) * sourceAlpha * weight;
          green += (source.rgba[sourceIndex + 1] / 255) * sourceAlpha * weight;
          blue += (source.rgba[sourceIndex + 2] / 255) * sourceAlpha * weight;
        }
      }

      const outputIndex = (y * size + x) * 4;
      layer[outputIndex] = Math.max(0, Math.min(1, red));
      layer[outputIndex + 1] = Math.max(0, Math.min(1, green));
      layer[outputIndex + 2] = Math.max(0, Math.min(1, blue));
      layer[outputIndex + 3] = Math.max(0, Math.min(1, alpha));
    }
  }

  return layer;
}

function gaussianKernel(sigma) {
  const radius = Math.ceil(sigma * 3);
  const kernel = [];
  let total = 0;
  for (let offset = -radius; offset <= radius; offset += 1) {
    const value = Math.exp(-(offset * offset) / (2 * sigma * sigma));
    kernel.push(value);
    total += value;
  }
  return kernel.map((value) => value / total);
}

function blurredAlpha(layer, size, sigma) {
  const kernel = gaussianKernel(sigma);
  const radius = Math.floor(kernel.length / 2);
  const horizontal = new Float32Array(size * size);
  const output = new Float32Array(size * size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let value = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        const sampleX = Math.max(0, Math.min(size - 1, x + offset));
        value += layer[(y * size + sampleX) * 4 + 3] * kernel[offset + radius];
      }
      horizontal[y * size + x] = value;
    }
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let value = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        const sampleY = Math.max(0, Math.min(size - 1, y + offset));
        value += horizontal[sampleY * size + x] * kernel[offset + radius];
      }
      output[y * size + x] = value;
    }
  }

  return output;
}

function compositeIcon(source, bounds, size) {
  const layer = renderOfficialLayer(source, bounds, size);
  const shadow = blurredAlpha(layer, size, Math.max(0.7, size * 0.009));
  const rgba = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const pixel = y * size + x;
      const index = pixel * 4;
      const normalizedX = (x + 0.5 - size / 2) / (size / 2);
      const normalizedY = (y + 0.5 - size * 0.45) / (size / 2);
      const distance = Math.min(1, Math.sqrt(normalizedX ** 2 + normalizedY ** 2));
      const edge = distance * distance * (3 - 2 * distance);

      // Four RGB levels across the icon: visible to the eye as material, not as an effect.
      let red = (250 * (1 - edge) + 246 * edge) / 255;
      let green = (250 * (1 - edge) + 247 * edge) / 255;
      let blue = (248 * (1 - edge) + 244 * edge) / 255;

      const shadowY = Math.max(0, y - Math.round(size * 0.006));
      const shadowAlpha = shadow[shadowY * size + x] * 0.055;
      const shadowRed = 24 / 255;
      const shadowGreen = 58 / 255;
      const shadowBlue = 89 / 255;
      red = shadowRed * shadowAlpha + red * (1 - shadowAlpha);
      green = shadowGreen * shadowAlpha + green * (1 - shadowAlpha);
      blue = shadowBlue * shadowAlpha + blue * (1 - shadowAlpha);

      const alpha = layer[index + 3];
      red = layer[index] + red * (1 - alpha);
      green = layer[index + 1] + green * (1 - alpha);
      blue = layer[index + 2] + blue * (1 - alpha);

      rgba[index] = Math.round(Math.max(0, Math.min(1, red)) * 255);
      rgba[index + 1] = Math.round(Math.max(0, Math.min(1, green)) * 255);
      rgba[index + 2] = Math.round(Math.max(0, Math.min(1, blue)) * 255);
      rgba[index + 3] = 255;
    }
  }

  return { width: size, height: size, rgba };
}

const source = decodePng(SOURCE);
const bounds = coloredBounds(source);

for (const [filename, size] of TARGETS) {
  const icon = compositeIcon(source, bounds, size);
  writeFileSync(join(ASSET_DIR, filename), encodePng(icon));
  console.log(`generated ${filename} (${size}x${size})`);
}

if (process.argv.includes("--preview")) {
  const preview = createPreview(source, bounds);
  const previewPath = "/tmp/leti-app-icon-rounded-preview.png";
  writeFileSync(previewPath, encodePng(preview));
  console.log(`generated ${previewPath}`);
}

console.log(
  `official colored bounds: [${bounds.left},${bounds.top}]-[${bounds.right},${bounds.bottom}]`,
);
