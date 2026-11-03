#!/usr/bin/env python3
"""
Build the web fonts: Smartisan Compact (the Panshaker brand face) cut down to the glyphs
this site uses. The full TTFs are ~8 MB each because they cover every CJK character;
the subsets are a few dozen KB.

    pip install fonttools brotli
    python3 scripts/subset_fonts.py ../panshaker-official-websites-legacy-main/assets/fonts

Re-run it after changing Chinese copy in public/js/i18n.js or public/index.html.
"""

import os
import re
import sys

from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "assets", "fonts")
WEIGHTS = ("Regular", "Medium", "Bold")
TEXT_SOURCES = ("public/js/i18n.js", "public/index.html", "public/js/app.js")

# Latin, Latin-1, punctuation, currency, arrows and the symbols the UI prints.
BASE_UNICODES = (
    list(range(0x20, 0x7F)) + list(range(0xA0, 0x100))
    + [0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026, 0x2212, 0x00D7,
       0x2190, 0x2191, 0x2192, 0x2193, 0x2248, 0x25B2, 0x25BC, 0x3001, 0x3002, 0xFF08,
       0xFF09, 0xFF0C, 0xFF1A, 0xFF1B, 0xFF1F, 0xFF01, 0x300C, 0x300D]
)


def site_cjk():
    chars = set()
    for rel in TEXT_SOURCES:
        with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
            chars.update(re.findall(r"[　-〿一-鿿＀-￯]", f.read()))
    return "".join(sorted(chars))


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src_dir = sys.argv[1]
    cjk = site_cjk()
    os.makedirs(OUT_DIR, exist_ok=True)
    for weight in WEIGHTS:
        src = os.path.join(src_dir, f"Smartisan_Compact-{weight}.ttf")
        out = os.path.join(OUT_DIR, f"SmartisanCompact-{weight}.woff2")
        options = subset.Options()
        options.flavor = "woff2"
        options.layout_features = ["*"]
        options.name_IDs = ["*"]
        options.notdef_outline = True
        font = subset.load_font(src, options)
        subsetter = subset.Subsetter(options)
        subsetter.populate(unicodes=BASE_UNICODES, text=cjk)
        subsetter.subset(font)
        subset.save_font(font, out, options)
        print(f"{os.path.basename(out)}: {os.path.getsize(out) / 1024:.0f} KB")
    print(f"{len(cjk)} CJK characters")


if __name__ == "__main__":
    main()
