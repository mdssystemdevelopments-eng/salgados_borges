from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LOGO_SRC = ROOT / "public" / "cms" / "logo-salgados-borges.png"
LOGO_OUT = ROOT / "public" / "cms" / "logo-salgados-borges.png"
PUBLIC = ROOT / "public"


def apply_circle_mask(img: Image.Image, inset: float = 0.02, feather: float = 1.5) -> Image.Image:
    """Remove o quadrado preto fora do emblema circular."""
    out = img.convert("RGBA")
    w, h = out.size
    cx, cy = w / 2, h / 2
    radius = min(w, h) / 2 * (1 - inset)
    px = out.load()
    for y in range(h):
        for x in range(w):
            dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            r, g, b, a = px[x, y]
            if dist > radius:
                px[x, y] = (r, g, b, 0)
            elif dist > radius - feather:
                fade = max(0.0, min(1.0, (radius - dist) / feather))
                px[x, y] = (r, g, b, int(a * fade))
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
    return out


def fit_square(icon: Image.Image, size: int, padding_ratio: float = 0.06) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * (1 - padding_ratio * 2))
    ratio = min(inner / icon.width, inner / icon.height)
    nw = max(1, int(icon.width * ratio))
    nh = max(1, int(icon.height * ratio))
    resized = icon.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (size - nw) // 2
    y = (size - nh) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


def main() -> None:
    if not LOGO_SRC.exists():
        raise SystemExit(f"Logo nao encontrado: {LOGO_SRC}")

    raw = Image.open(LOGO_SRC)
    logo = apply_circle_mask(raw)
    logo.save(LOGO_OUT, "PNG")
    print(f"logo circular transparente: {LOGO_OUT} ({logo.size[0]}x{logo.size[1]})")

    base = fit_square(logo, 256, padding_ratio=0.04)
    icon16 = base.resize((16, 16), Image.Resampling.LANCZOS)
    icon32 = base.resize((32, 32), Image.Resampling.LANCZOS)
    icon180 = base.resize((180, 180), Image.Resampling.LANCZOS)

    icon32.save(PUBLIC / "favicon.png", "PNG")
    icon32.save(PUBLIC / "favicon-32.png", "PNG")
    icon180.save(PUBLIC / "apple-touch-icon.png", "PNG")
    icon32.save(PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32)])

    print("favicons gerados em public/")


if __name__ == "__main__":
    main()
