# Tray icons: the archv3d diamond, colored by stream status (electron/main.cjs picks one per status).
# Run from desktop/: python build/make-icons.py
from PIL import Image, ImageDraw

COLORS = {
    'available': '#5ed38a',
    'busy': '#e6b450',
    'starting': '#e6b450',
    'asleep': '#8aa6de',
    'off': '#f0645a',
    'unknown': '#8a8a8a',
}

def diamond(size, color, outline='#0f1013'):
    scale = 8  # draw large, then shrink for smooth edges
    big = size * scale
    image = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    c = big / 2
    r = big * 0.47
    draw.polygon([(c, c - r), (c + r, c), (c, c + r), (c - r, c)], fill=outline)  # dark rim, visible on light taskbars
    r2 = r - big * 0.09
    draw.polygon([(c, c - r2), (c + r2, c), (c, c + r2), (c - r2, c)], fill=color)
    return image.resize((size, size), Image.LANCZOS)

for key, color in COLORS.items():
    diamond(16, color).save(f'build/tray/tray-{key}.png')
    diamond(32, color).save(f'build/tray/tray-{key}@2x.png')
diamond(256, '#d9b77e').save('build/tray/app.png')
