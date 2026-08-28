from PIL import Image


def luminance(r: int, g: int, b: int) -> float:
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def knock_out_dark(input_path: str, output_path: str, lum_threshold: float = 98) -> None:
    img = Image.open(input_path).convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, _a = px[x, y]
            lum = luminance(r, g, b)
            if lum >= lum_threshold:
                px[x, y] = (r, g, b, 255)
            elif lum >= lum_threshold - 22:
                fade = (lum - (lum_threshold - 22)) / 22
                px[x, y] = (r, g, b, int(max(0, min(255, fade * 255))))
            else:
                px[x, y] = (r, g, b, 0)
    bbox = img.getbbox()
    if bbox:
        pad = 4
        bbox = (
            max(0, bbox[0] - pad),
            max(0, bbox[1] - pad),
            min(w, bbox[2] + pad),
            min(h, bbox[3] + pad),
        )
        img = img.crop(bbox)
    img.save(output_path, "PNG")
    print(f"saved {output_path} size={img.size}")


if __name__ == "__main__":
    knock_out_dark("public/cms/logo-salgados-borges.png", "public/cms/logo-salgados-borges.png")
