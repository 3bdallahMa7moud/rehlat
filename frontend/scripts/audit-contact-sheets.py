import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

folder = Path("artifacts/site-audit")
pages = json.loads((folder / "results.json").read_text(encoding="utf-8"))["pages"]
font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 14)

for role in ("participant", "admin", "auth"):
    for viewport in ("desktop", "mobile"):
        group = [page for page in pages if page["role"] == role and page["viewport"] == viewport]
        if not group:
            continue
        columns = 3 if viewport == "mobile" else 4
        tile_width, image_height = (260, 562) if viewport == "mobile" else (360, 225)
        tile_height = image_height + 30
        for offset in range(0, len(group), 12):
            chunk = group[offset:offset + 12]
            rows = (len(chunk) + columns - 1) // columns
            sheet = Image.new("RGB", (columns * tile_width, rows * tile_height), "#eee")
            draw = ImageDraw.Draw(sheet)
            for index, page in enumerate(chunk):
                picture = Image.open(folder / page["screenshot"])
                picture.thumbnail((tile_width, image_height), Image.Resampling.LANCZOS)
                x = (index % columns) * tile_width
                y = (index // columns) * tile_height
                sheet.paste(picture, (x, y))
                draw.text((x + 4, y + image_height + 5), page["route"], fill="black", font=font)
            filename = f"sheet-{role}-{viewport}-{offset // 12 + 1}.jpg"
            sheet.save(folder / filename, quality=88)
            print(filename)
