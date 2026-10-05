#!/usr/bin/env python3
"""Download the small, self-hosted font subsets used by the studio."""
from pathlib import Path
from urllib.request import Request, urlopen
import re

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public' / 'fonts'
USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
ICONS = sorted(set('''add_photo_alternate aspect_ratio auto_awesome bubble_chart casino category check_circle content_copy dark_mode devices dock_to_right download error folder hourglass_top image_search language laptop light_mode link palette polyline redo settings smartphone swap_horiz terminal terrain tune undo waves'''.split()))


def fetch(url):
    with urlopen(Request(url, headers={'User-Agent': USER_AGENT}), timeout=30) as response:
        return response.read()


def download_font(name, css_url, latin=False):
    css = fetch(css_url).decode()
    blocks = re.findall(r'(@font-face\s*\{[^}]+\})', css)
    if latin:
        blocks = [block for block in blocks if 'U+0000-00FF' in block]
    if len(blocks) != 1:
        raise RuntimeError(f'Expected one font subset for {name}, got {len(blocks)}')
    block = blocks[0]
    url, format_name = re.search(r'src:\s*url\(([^)]+)\)\s*format\([\'"]([^\'"]+)', block).groups()
    extension = {'woff2': 'woff2', 'truetype': 'ttf', 'woff': 'woff'}[format_name]
    output = DEST / f'{name}.{extension}'
    output.write_bytes(fetch(url))
    print(f'{output.relative_to(ROOT)}: {output.stat().st_size} bytes')
    return block.replace(url, f'./{output.name}')


DEST.mkdir(parents=True, exist_ok=True)
icon_css = download_font('material-symbols-rounded',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..24,400..500,0..1,0&icon_names=' + ','.join(ICONS) + '&display=block')
text_css = download_font('plus-jakarta-sans-latin',
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400..700&display=swap', latin=True)
(DEST / 'fonts.css').write_text(icon_css + '\n' + text_css + '\n')
(DEST / 'MATERIAL-SYMBOLS-LICENSE.txt').write_bytes(fetch('https://raw.githubusercontent.com/google/material-design-icons/master/LICENSE'))
(DEST / 'PLUS-JAKARTA-SANS-LICENSE.txt').write_bytes(fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/OFL.txt'))
