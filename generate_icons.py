from PIL import Image, ImageDraw
import math, os

def create_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Dark rounded rectangle background
    radius = max(2, size // 5)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=(15, 15, 15, 255))

    # Red circle (upper-center)
    cx = size / 2
    circle_r = size * 0.27
    circle_cy = size * 0.40
    draw.ellipse(
        [cx - circle_r, circle_cy - circle_r, cx + circle_r, circle_cy + circle_r],
        fill=(204, 0, 0, 255)
    )

    # White play triangle inside the circle
    tr = circle_r * 0.55
    play_pts = [
        (cx - tr * 0.55, circle_cy - tr),
        (cx - tr * 0.55, circle_cy + tr),
        (cx + tr * 0.85, circle_cy),
    ]
    draw.polygon(play_pts, fill=(255, 255, 255, 255))

    # White chevron below the circle
    chev_y = size * 0.75
    chev_w = size * 0.28
    chev_h = size * 0.11
    sw = max(1, round(size / 10))
    draw.line(
        [(cx - chev_w, chev_y - chev_h), (cx, chev_y), (cx + chev_w, chev_y - chev_h)],
        fill=(255, 255, 255, 255),
        width=sw,
        joint='curve'
    )

    return img

os.makedirs('extension/icons', exist_ok=True)

for size in [16, 48, 128]:
    img = create_icon(size)
    path = f'extension/icons/icon{size}.png'
    img.save(path)
    print(f'Created {path}')

print('Done.')
