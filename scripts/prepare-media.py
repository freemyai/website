"""Resize locally captured screenshots for the static gallery (requires Pillow)."""
from pathlib import Path
import sys
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'assets' / 'media'
names = ['hydraulics', 'hearthlight', 'wave-tank', 'star-hop', 'harmonograph',
         'triple-pendulum', 'infinite-room', 'light-and-optics', 'windtunnel', 'chroma',
         'soft-machine', 'rosette', 'pulse', 'senbazuru', 'orbital', 'labyrinthos',
         'hyperbrick', 'galerie-nocturne', 'dune-engine', 'planet-forge', 'luminote', 'aquarelle',
         'tree-appreciator', 'chak-chak-mage', 'battle-drones', 'knockbots', 'lili-last-door',
         'afterlight', 'felt-world', 'null-range', 'kanso', 'web-bayan']
selected = sys.argv[1:] or names
unknown = set(selected) - set(names)
if unknown:
    raise SystemExit(f'Unknown captures: {", ".join(sorted(unknown))}')
for name in selected:
    source = root / f'{name}.jpg'
    if not source.exists():
        raise SystemExit(f'Missing capture: {source}')
    image = Image.open(source).convert('RGB')
    for width in (480, 960, 1440):
        if width <= image.width:
            resized = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
            resized.save(root / f'{name}-{width}.webp', 'WEBP', quality=82, method=5)
    print(f'Prepared {name}: {image.width}x{image.height}')
