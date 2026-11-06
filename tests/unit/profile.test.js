import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProfileArtwork, updateProfile, replaceWallpaperBlock } from '../../scripts/generate-profile.mjs';
import { wallpaperFromHash } from '../../src/core/session.js';
import { generateSVGString } from '../../src/core/svg-exporter.js';

const template = '# Keep this heading\n<!-- WALLPAPER:START -->\nold\n<!-- WALLPAPER:END -->\nMy projects stay here.\n';

test('generated art round-trips through the real share format and SVG exporter without a DOM', () => {
  const modes = new Set();
  for (let seed = 100000; modes.size < 6 && seed < 100100; seed++) {
    const art = createProfileArtwork(seed);
    modes.add(art.state.artMode);
    const shared = wallpaperFromHash(new URL(art.shareURL).hash);
    assert.deepEqual(shared, art.state);
    assert.equal(generateSVGString(shared, shared.targetW, shared.targetH), art.wallpaper);
    assert.ok(art.banner.includes('Do something impossible.'));
    assert.doesNotMatch(art.banner, /NaN|undefined|<script|<foreignObject|<image/);
  }
  assert.equal(modes.size, 6);
  assert.deepEqual(createProfileArtwork(42), createProfileArtwork(42));
  for (const seed of [0, -1, NaN, 1.1, 2147483647]) assert.throws(() => createProfileArtwork(seed));
});

test('refresh preserves manual text, rotates asset URLs, prunes only generated files and keeps matching links', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wallpaper-profile-'));
  try {
    await writeFile(join(dir, 'README.md'), template);
    const first = await updateProfile(dir, { seed: 42, now: new Date('2026-11-07T00:00:00Z') });
    const assetDir = join(dir, 'assets/wallpaper');
    await writeFile(join(assetDir, 'keep.svg'), '<svg/>');
    const second = await updateProfile(dir, { seed: 20261107, now: new Date('2026-11-07T06:00:00Z') });
    const readme = await readFile(join(dir, 'README.md'), 'utf8');
    assert.notEqual(second.assetPath, first.assetPath);
    assert.ok(readme.startsWith('# Keep this heading\n'));
    assert.ok(readme.endsWith('\nMy projects stay here.\n'));
    assert.ok(readme.includes(second.shareURL) && readme.includes(second.assetPath));
    assert.ok(!readme.includes(first.shareURL));
    assert.equal(await readFile(join(dir, second.assetPath), 'utf8'), second.banner);
    const manifest = JSON.parse(await readFile(join(assetDir, 'current.json'), 'utf8'));
    assert.deepEqual(manifest.state, wallpaperFromHash(new URL(manifest.shareURL).hash));
    assert.equal(await readFile(join(assetDir, manifest.wallpaper), 'utf8'), second.wallpaper);
    assert.equal((await readdir(assetDir)).length, 4); // two current images, manifest, manual file
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('missing, reversed or duplicate markers fail before modifying the profile', async () => {
  for (const text of ['', '<!-- WALLPAPER:END --><!-- WALLPAPER:START -->',
    template + '<!-- WALLPAPER:START -->', template + '<!-- WALLPAPER:END -->']) {
    assert.throws(() => replaceWallpaperBlock(text, 'new'));
  }
  const dir = await mkdtemp(join(tmpdir(), 'wallpaper-profile-'));
  try {
    await writeFile(join(dir, 'README.md'), 'Manual README');
    await assert.rejects(updateProfile(dir, { seed: 42 }));
    assert.deepEqual(await readdir(dir), ['README.md']);
    assert.equal(await readFile(join(dir, 'README.md'), 'utf8'), 'Manual README');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
