"""Render Freemy share images from the catalog's local, reviewed media.

Invoke through generate-og.mjs; stdin contains its catalog-derived plan.
Pillow 10.2.0 was used for the checked-in images. Its built-in font is used
instead of a machine-specific font, and JPEGs contain no metadata or dates.
"""
from functools import lru_cache
from pathlib import Path
import json
import re
import sys
import unicodedata

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PAPER = '#f7f7f2'
INK = '#1d3525'
MUTED = '#708070'
LIME = '#d8f876'
LINE = '#dce5d8'
SHEET = '#edf1e9'
WIDTH, HEIGHT = 1200, 630


@lru_cache(maxsize=None)
def font(size):
    return ImageFont.load_default(size=size)


def basic_glyphs(text):
    """Use the bundled ASCII font while retaining common Latin accents."""
    chars, accents = [], []
    punctuation = {'—': '-', '–': '-', '’': "'", '“': '"', '”': '"'}
    for char in unicodedata.normalize('NFD', text):
        if unicodedata.combining(char):
            if chars and char in ('\u0301', '\u0304'):
                accents.append((len(chars) - 1, char))
        elif char in punctuation:
            chars.append(punctuation[char])
        elif ' ' <= char <= '~':
            chars.append(char)
        else:
            chars.append('?')
    return ''.join(chars), accents


def label(draw, position, text, size=16, color=MUTED, bold=False):
    face = font(size)
    basic, accents = basic_glyphs(text)
    stroke = 1 if bold else 0
    draw.text(position, basic, font=face, fill=color,
              stroke_width=stroke, stroke_fill=color)
    for index, mark in accents:
        start = draw.textlength(basic[:index], font=face)
        end = draw.textlength(basic[:index+1], font=face)
        center = round(position[0] + (start + end) / 2)
        top = draw.textbbox(position, basic[index], font=face, stroke_width=stroke)[1]
        bottom = top - max(3, round(size * .04))
        half = max(3, round(size * .08))
        width = max(1, round(size * .035))
        if mark == '\u0301':
            draw.line((center-half, bottom, center+half, bottom-half), fill=color, width=width)
        elif mark == '\u0304':
            draw.line((center-half, bottom, center+half, bottom), fill=color, width=width)


def brand(draw, x, y, scale=1, light=False):
    ink = '#f7f7f2' if light else INK
    # The two rounded squares are the same shapes as the site's favicon.
    draw.rounded_rectangle((x, y + 4*scale, x + 33*scale, y + 37*scale),
                           radius=9*scale, outline=ink, width=3*scale)
    draw.rounded_rectangle((x + 24*scale, y - 2*scale, x + 39*scale, y + 13*scale),
                           radius=4*scale, fill=LIME, outline=ink, width=2*scale)
    label(draw, (x + 50*scale, y - 5*scale), 'freemy', 43*scale, ink, True)
    length = draw.textlength('freemy', font=font(43*scale))
    label(draw, (x + 51*scale + length, y - 5*scale), '.', 43*scale, '#96bb45', True)


def wrapped(draw, text, size, max_width, bold=True, break_words=False):
    f = font(size)
    stroke = 1 if bold else 0
    lines = []
    for word in text.split():
        line = f'{lines[-1]} {word}' if lines else word
        if draw.textlength(basic_glyphs(line)[0], font=f) + 2*stroke <= max_width:
            if lines:
                lines[-1] = line
            else:
                lines.append(line)
        else:
            if draw.textlength(basic_glyphs(word)[0], font=f) + 2*stroke <= max_width:
                lines.append(word)
                continue
            if not break_words:
                return None
            # Long unspaced names are split at character boundaries, never cut off.
            piece = ''
            for char in word:
                if piece and draw.textlength(basic_glyphs(piece + char)[0], font=f) + 2*stroke > max_width:
                    lines.append(piece)
                    piece = char
                else:
                    piece += char
            lines.append(piece)
    return lines


def heading(draw, text, x=52, y=180, max_width=252, max_height=220):
    for size in range(42, 19, -1):
        lines = wrapped(draw, text, size, max_width)
        line_height = round(size * 1.24)
        if lines is not None and len(lines) * line_height <= max_height:
            for i, line in enumerate(lines):
                label(draw, (x, y + i*line_height), line, size, INK, True)
            return
    lines = wrapped(draw, text, 20, max_width, break_words=True)
    if len(lines) * 25 <= max_height:
        for i, line in enumerate(lines):
            label(draw, (x, y + i*25), line, 20, INK, True)
        return
    raise ValueError(f'Title does not fit: {text}')


def base():
    image = Image.new('RGB', (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(image)
    draw.line((52, 524, 300, 524), fill=LINE, width=2)
    label(draw, (52, 544), 'FREEMY.AI', 16, MUTED, True)
    brand(draw, 52, 50)
    return image, draw


def source_image(poster):
    # Only generated site media paths are accepted; no browser or network access.
    if not re.fullmatch(r'/media/[a-z0-9-]+-960\.webp', poster):
        raise ValueError(f'Invalid local preview path: {poster}')
    with Image.open(ROOT / 'assets' / poster.lstrip('/')) as image:
        return image.convert('RGB')


def picture(canvas, poster, box):
    """Contain the full screenshot inside its frame without crop or distortion."""
    left, top, right, bottom = box
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((left - 8, top - 8, right + 8, bottom + 8),
                           radius=12, fill='#ffffff', outline=LINE, width=2)
    draw.rectangle(box, fill=SHEET)
    screenshot = source_image(poster)
    screenshot.thumbnail((right-left, bottom-top), Image.Resampling.LANCZOS)
    canvas.paste(screenshot, (left + (right-left-screenshot.width)//2,
                              top + (bottom-top-screenshot.height)//2))


def montage(canvas, previews):
    if len(previews) == 1:
        picture(canvas, previews[0]['poster'], (352, 68, 1152, 568))
        return
    # Every small image remains completely visible, including interface panels.
    if len(previews) == 2:
        boxes = [(352, 191, 738, 433), (766, 191, 1152, 433)]
    else:
        boxes = [(352, 66, 738, 307), (766, 66, 1152, 307),
                 (352, 333, 738, 574), (766, 333, 1152, 574)]
    for preview, box in zip(previews, boxes):
        picture(canvas, preview['poster'], box)


def work_image(item):
    image, draw = base()
    label(draw, (52, 145), 'FROM THE GALLERY', 15, MUTED, True)
    heading(draw, item['title'])
    picture(image, item['poster'], (352, 68, 1152, 568))
    return image


def home_image(item):
    image, draw = base()
    label(draw, (52, 145), 'EXPLORE FREEMY', 15, MUTED, True)
    heading(draw, 'Imagination, set free.')
    montage(image, item['works'])
    return image


def collection_image(item):
    image, draw = base()
    label(draw, (52, 145), 'A FREEMY COLLECTION', 15, MUTED, True)
    heading(draw, item['title'])
    montage(image, item['works'])
    return image


def fallback_image():
    image = Image.new('RGB', (WIDTH, HEIGHT), INK)
    draw = ImageDraw.Draw(image)
    brand(draw, 72, 64, 2, light=True)
    label(draw, (76, 265), 'Imagination,', 58, PAPER, True)
    label(draw, (76, 341), 'set free.', 58, PAPER, True)
    draw.line((78, 522, 540, 522), fill='#648260', width=2)
    label(draw, (78, 544), 'DISCOVER AT FREEMY.AI', 17, '#c0d8ac', True)
    # Brand geometry, not a representation of an unavailable work.
    draw.rounded_rectangle((755, 170, 1028, 443), radius=55, outline=PAPER, width=15)
    draw.rounded_rectangle((964, 119, 1087, 242), radius=30, fill=LIME, outline=PAPER, width=12)
    return image


def save(image, output, name):
    if not re.fullmatch(r'(?:home|fallback|collection-[a-z0-9-]+|work-[a-z0-9-]+)\.jpg', name):
        raise ValueError(f'Invalid output name: {name}')
    image.save(output / name, 'JPEG', quality=84, subsampling=0, optimize=True, progressive=True)


def main():
    # Node writes UTF-8 to the pipe; the Windows locale may default to GBK.
    plan = json.loads(sys.stdin.buffer.read().decode('utf-8'))
    output = Path(plan['output'])
    output.mkdir(parents=True, exist_ok=True)
    save(home_image(plan['home']), output, plan['home']['file'])
    save(fallback_image(), output, plan['fallback']['file'])
    for item in plan['collections']:
        save(collection_image(item), output, item['file'])
    for item in plan['works']:
        save(work_image(item), output, item['file'])
    print(f"Generated {2 + len(plan['collections']) + len(plan['works'])} share images.")


if __name__ == '__main__':
    main()
