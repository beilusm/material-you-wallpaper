import { randomInt, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { createRNG } from '../src/core/geometry.js';
import { createDefaultState, snapshotWallpaper } from '../src/core/state.js';
import { ART_MODES, MAX_SEED } from '../src/core/validation.js';
import { PALETTES } from '../src/constants/palettes.js';
import { generateSVGString } from '../src/core/svg-exporter.js';
import { createShareURL } from '../src/core/session.js';

const START = '<!-- WALLPAPER:START -->';
const END = '<!-- WALLPAPER:END -->';
const SITE = 'https://beilusm.github.io/material-you-wallpaper/';
const MODE_NAMES = {
  waves: '极简波浪', pebbles: '有机圆石', topography: '等高纸艺',
  arcs: '日出光环', bloom: '层叠花窗', hills: '远山层峦'
};

export function createProfileArtwork(seed = randomInt(1, MAX_SEED + 1)) {
  if (!Number.isInteger(seed) || seed < 1 || seed > MAX_SEED) throw new RangeError('Invalid seed');
  // Reuse the site's geometry and share format. No grain means no DOM or canvas dependency.
  const rng = createRNG(seed);
  const pick = items => items[Math.floor(rng() * items.length)];
  const palette = pick(PALETTES);
  const state = snapshotWallpaper({ ...createDefaultState(), seed,
    targetW: 1600, targetH: 640, artMode: pick(ART_MODES),
    color1: palette.c1, color2: palette.c2, bandCount: 3 + Math.floor(rng() * 4),
    angle: Math.floor(rng() * 111) - 55, curvature: 0.3 + rng() * 0.35,
    harmonics: 1 + Math.floor(rng() * 2), hasShadow: true, useGradient: true, grain: 0
  });
  const wallpaper = generateSVGString(state, state.targetW, state.targetH);
  const banner = wallpaper.replace('<title>Material You Wallpaper - ' + state.artMode + '</title>',
    '<title>beilusm — Do something impossible.</title>\n<desc>A randomly generated Material You wallpaper. Click to edit this artwork.</desc>')
    .replace('</svg>', `<defs>
<linearGradient id="profile-shade"><stop stop-color="#091712" stop-opacity=".86"/><stop offset=".65" stop-color="#091712" stop-opacity=".50"/><stop offset="1" stop-color="#091712" stop-opacity=".06"/></linearGradient>
</defs>
<rect width="1600" height="640" fill="url(#profile-shade)"/>
<g fill="#f1f8f4" font-family="Arial, Helvetica, sans-serif">
  <rect x="88" y="100" width="10" height="10" rx="5" fill="#b2e6c8"/>
  <text x="116" y="111" font-size="18" letter-spacing="4">A LITTLE RANDOM. ALWAYS ME.</text>
  <text x="82" y="306" font-size="112" font-weight="700" letter-spacing="-5">beilusm</text>
  <text x="88" y="371" font-size="32" fill="#e1eee7">Do something impossible.</text>
  <path d="M88 458H152" stroke="#b2e6c8" stroke-width="3"/>
  <text x="88" y="516" font-size="19" letter-spacing="2">MATERIAL YOU / GENERATIVE WALLPAPER</text>
  <text x="88" y="550" font-size="18" fill="#d3e5db">A new canvas every 6 hours. Click to make it yours.</text>
  <circle cx="1488" cy="528" r="36" fill="#eff8f2" fill-opacity=".92"/>
  <path d="M1474 542L1500 516M1474 516H1500V542" fill="none" stroke="#1b3529" stroke-width="3"/>
</g>
</svg>`);
  return { state, wallpaper, banner, shareURL: createShareURL(state, SITE),
    mode: MODE_NAMES[state.artMode], palette: palette.name };
}

export function replaceWallpaperBlock(readme, block) {
  const start = readme.indexOf(START), end = readme.indexOf(END);
  if (start < 0 || end < start || readme.indexOf(START, start + START.length) !== -1 ||
      readme.indexOf(END, end + END.length) !== -1) {
    throw new Error('README must contain exactly one ordered WALLPAPER:START / WALLPAPER:END pair');
  }
  return readme.slice(0, start + START.length) + '\n' + block + '\n' + readme.slice(end);
}

export async function updateProfile(profileDir, { seed, now = new Date() } = {}) {
  const readmePath = join(profileDir, 'README.md');
  const readme = await readFile(readmePath, 'utf8');
  const artwork = createProfileArtwork(seed);
  // New paths prevent old GitHub image-cache entries from being reused on the next refresh.
  const id = createHash('sha256').update(artwork.banner).digest('hex').slice(0, 16);
  const bannerName = `banner-${id}.svg`, wallpaperName = `wallpaper-${id}.svg`;
  const assetPath = `assets/wallpaper/${bannerName}`;
  const timestamp = now.toISOString();
  const block = `[![beilusm — 随机生成的 Material You 壁纸，点击编辑同款](${assetPath})](${artwork.shareURL})\n\n` +
    `<p align="center">\n<b>${artwork.mode} · ${artwork.palette}</b><br>\n` +
    `每 6 小时换一张 · <a href="${artwork.shareURL}">编辑 / 下载同款壁纸 ↗</a><br>\n` +
    `<sub>最近生成：${timestamp.slice(0, 16).replace('T', ' ')} UTC</sub>\n</p>`;
  // Validate before writing any assets; other README sections are preserved.
  const updatedReadme = replaceWallpaperBlock(readme, block);
  const assetDir = join(profileDir, 'assets/wallpaper');
  await mkdir(assetDir, { recursive: true });
  await writeFile(join(assetDir, bannerName), artwork.banner);
  await writeFile(join(assetDir, wallpaperName), artwork.wallpaper);
  await writeFile(join(assetDir, 'current.json'), JSON.stringify({ generatedAt: timestamp,
    banner: bannerName, wallpaper: wallpaperName, shareURL: artwork.shareURL, state: artwork.state }, null, 2) + '\n');
  await writeFile(readmePath, updatedReadme);
  // Only prune files owned by this generator.
  for (const name of await readdir(assetDir)) {
    if (/^(banner|wallpaper)-[a-f0-9]{16}\.svg$/.test(name) && name !== bannerName && name !== wallpaperName) {
      await unlink(join(assetDir, name));
    }
  }
  return { ...artwork, assetPath };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: { profile: { type: 'string' }, seed: { type: 'string' } } });
  if (!values.profile) throw new Error('Usage: node scripts/generate-profile.mjs --profile /path/to/beilusm [--seed 42]');
  const artwork = await updateProfile(resolve(values.profile), {
    seed: values.seed === undefined ? undefined : Number(values.seed)
  });
  console.log(`Generated ${artwork.mode} / ${artwork.palette}: ${artwork.assetPath}`);
}
