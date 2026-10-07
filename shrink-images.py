#!/usr/bin/env python3
import argparse
from pathlib import Path

from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = None


def flatten(im: Image.Image) -> Image.Image:
    if "A" not in im.getbands() and im.mode != "P":
        return im.convert("RGB")
    rgba = im.convert("RGBA")
    base = Image.new("RGB", rgba.size, (255, 255, 255))
    base.paste(rgba, mask=rgba.getchannel("A"))
    return base


def shrink(src: Path, edge: int, quality: int) -> Path:
    dst = src.with_suffix(".webp")
    with Image.open(src) as raw:
        icc = raw.info.get("icc_profile")
        im = flatten(ImageOps.exif_transpose(raw))
    scale = edge / min(im.size)
    if scale < 1:
        size = (round(im.width * scale), round(im.height * scale))
        im = im.resize(size, Image.Resampling.LANCZOS, reducing_gap=3.0)
    im.save(dst, "WEBP", quality=quality, method=6, icc_profile=icc)
    return dst


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Write a web-sized .webp next to each image; the shorter side is capped at --edge."
    )
    parser.add_argument("images", nargs="+", type=Path)
    parser.add_argument("--edge", type=int, default=800)
    parser.add_argument("--quality", type=int, default=80)
    parser.add_argument("--replace", action="store_true", help="delete each source once its .webp is written")
    args = parser.parse_args()

    before = after = 0
    for src in args.images:
        dst = shrink(src, args.edge, args.quality)
        a, b = src.stat().st_size, dst.stat().st_size
        before, after = before + a, after + b
        print(f"{src} {a / 1e6:.1f}MB -> {dst.name} {b / 1e3:.0f}KB")
        if args.replace and dst != src:
            src.unlink()
    print(f"total {before / 1e6:.1f}MB -> {after / 1e6:.2f}MB")


if __name__ == "__main__":
    main()
