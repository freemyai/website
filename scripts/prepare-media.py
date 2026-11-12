"""Resize locally captured screenshots for the static gallery (requires Pillow)."""
from pathlib import Path
from hashlib import sha256
import sys
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'assets' / 'media'
names = ['hydraulics', 'hearthlight', 'wave-tank', 'star-hop', 'harmonograph',
         'triple-pendulum', 'infinite-room', 'light-and-optics', 'windtunnel', 'chroma',
         'soft-machine', 'rosette', 'pulse', 'senbazuru', 'orbital', 'labyrinthos',
         'hyperbrick', 'galerie-nocturne', 'dune-engine', 'planet-forge', 'luminote', 'aquarelle',
         'tree-appreciator', 'chak-chak-mage', 'battle-drones', 'knockbots', 'lili-last-door',
         'afterlight', 'felt-world', 'null-range', 'kanso', 'web-bayan',
         'bottle-studio', 'wrong-physics', 'sakura-river-valley', 'learn-arduino',
         'type-sound', 'modfont', 'mpump', 'jamily', 'clearwater',
         'stave', 'bosphore-1819', 'cd-case', 'estheet',
         'plane-of-focus', 'genesis', 'koi-pond', 'earth-antenna',
         'orbital-elements', 'v8-engine', 'form-01', 'drone-lab',
         'terrain-rover', 'robolabs', 'heart-and-blood',
         'project-wednesday', 'blackhole-lab', 'roadster-explorer', 'wind-tide', 'spacex-vehicles',
         'quantum-eraser', 'ocean-currents', 'svt-3d', 'bee-x9', 'last-hexagon',
         'huolong', 'regolith', 'fall-line', 'glasswood']
selected = sys.argv[1:] or names
unknown = set(selected) - set(names)
if unknown:
    raise SystemExit(f'Unknown captures: {", ".join(sorted(unknown))}')

padded_captures = {'quantum-eraser', 'ocean-currents', 'svt-3d', 'bee-x9', 'last-hexagon',
                   'huolong', 'regolith', 'fall-line', 'glasswood'}
ocean_original_sha256 = '126925b74ec775f9fa55ed36877f4982f56d9a6505ee89b56c8144ce2b8b34f2'
for name in selected:
    source = root / f'{name}.jpg'
    if not source.exists():
        raise SystemExit(f'Missing capture: {source}')
    image = Image.open(source).convert('RGB')
    # Trim the pale top edge and scrollbar only for the exact original capture.
    if name == 'ocean-currents' and sha256(source.read_bytes()).hexdigest() == ocean_original_sha256:
        image = image.crop((0, 13, 1270, 672))
    # Preserve side panels in the gallery's 16:10 cover crop without altering the screenshot.
    if name in padded_captures and abs(image.width / image.height - 1.6) > .002:
        width = max(image.width, round(image.height * 1.6))
        height = max(image.height, round(image.width / 1.6))
        padded = Image.new('RGB', (width, height), image.getpixel((0, 0)))
        padded.paste(image, ((width - image.width) // 2, (height - image.height) // 2))
        image = padded
    for width in (480, 960, 1440):
        if width <= image.width:
            resized = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
            resized.save(root / f'{name}-{width}.webp', 'WEBP', quality=82, method=5)
    print(f'Prepared {name}: {image.width}x{image.height}')
