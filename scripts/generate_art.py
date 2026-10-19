#!/usr/bin/env python3
"""
Generate card art from docs/card-art-prompts.md, one image per file name.

Examples (run from the project root):

    # Show the exact prompt that would be sent, without sending anything
    python3 scripts/generate_art.py smithy --dry-run

    # Ask the Codex CLI (`codex exec`) to create the image
    python3 scripts/generate_art.py smithy --backend codex
    #   …if Codex's Linux sandbox can't start (bubblewrap / user namespaces):
    python3 scripts/generate_art.py smithy --backend codex --codex-sandbox danger-full-access

    # Call the OpenAI Images API directly (needs OPENAI_API_KEY in the environment)
    python3 scripts/generate_art.py smithy harbor frame --backend api

    # Everything that isn't generated yet
    python3 scripts/generate_art.py --all --backend api

Images are saved to art-src/<name>.png (git-ignored). Existing files are skipped
unless --force is given. Afterwards run `npm run art` to turn them into game assets.
Only the Python standard library is used.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOC = ROOT / "docs" / "card-art-prompts.md"

LANDSCAPE, PORTRAIT, SQUARE = "1536x1024", "1024x1536", "1024x1024"


@dataclass
class Item:
    name: str  # file name without .png
    prompt: str  # the item-specific text (the shared style is added separately)
    size: str


def parse_doc(text: str) -> tuple[str, dict[str, Item]]:
    """Reads the shared style block and every item from the prompt document."""
    style_match = re.search(r"## 共用風格.*?```\n(.*?)```", text, re.S)
    if not style_match:
        sys.exit("Could not find the shared style block in docs/card-art-prompts.md")
    style = style_match.group(1).strip()

    items: dict[str, Item] = {}
    section = ""
    for line in text.splitlines():
        if line.startswith("## "):
            section = line
        m = re.match(r"\|\s*`([\w-]+)\.png`\s*\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|\s*$", line)
        if not m:
            continue
        name, second, last = m.groups()
        last = last.strip("`")
        if section.startswith("## 建築插圖"):
            items[name] = Item(name, f"Illustration: {last}", LANDSCAPE)
        elif section.startswith("## 角色插圖"):
            items[name] = Item(
                name,
                f"Character illustration (same style, one person, waist-up): {last}",
                LANDSCAPE,
            )
        elif section.startswith("## 裝飾零件"):
            size = PORTRAIT if "直式" in second else SQUARE if "正方形" in second else LANDSCAPE
            items[name] = Item(name, last, size)

    back = re.search(r"## 卡背.*?```\n(.*?)```", text, re.S)
    if back:
        items["card-back"] = Item("card-back", back.group(1).strip(), PORTRAIT)
    return style, items


def full_prompt(style: str, item: Item) -> str:
    return f"{style}\n\n---\n\n{item.prompt}\n\nImage size: {item.size} pixels."


def generate_with_api(prompt: str, size: str, out: Path, model: str, quality: str) -> None:
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        sys.exit("OPENAI_API_KEY is not set (needed for --backend api).")
    body = json.dumps({"model": model, "prompt": prompt, "size": size, "quality": quality, "n": 1}).encode()
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            data = json.load(resp)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"API error {e.code}: {e.read().decode(errors='replace')}") from e
    image = data["data"][0]
    if "b64_json" in image:
        out.write_bytes(base64.b64decode(image["b64_json"]))
    else:  # some models return a URL instead
        with urllib.request.urlopen(image["url"], timeout=300) as resp:
            out.write_bytes(resp.read())


def generate_with_codex(prompt: str, size: str, out: Path, codex_args: list[str]) -> None:
    if not shutil.which("codex"):
        sys.exit("The `codex` command was not found. Install the Codex CLI or use --backend api.")
    task = (
        "Create ONE image for a card game and save it as a PNG file at this exact path:\n"
        f"{out}\n"
        f"Image size: {size}. Do not create or change any other files.\n\n"
        f"Image description:\n{prompt}"
    )
    result = subprocess.run(["codex", "exec", *codex_args, task], cwd=ROOT)
    if result.returncode != 0:
        raise RuntimeError(f"codex exited with code {result.returncode}")
    if not out.exists():
        raise RuntimeError("codex finished but no image was saved — it may not support image generation.")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("names", nargs="*", help="file names without .png, e.g. smithy role-trader frame")
    ap.add_argument("--all", action="store_true", help="every item in the document")
    ap.add_argument("--list", action="store_true", help="list available names and exit")
    ap.add_argument("--backend", choices=["codex", "api"], default="codex")
    ap.add_argument("--dry-run", action="store_true", help="print the prompt instead of generating")
    ap.add_argument("--force", action="store_true", help="regenerate images that already exist")
    ap.add_argument("--out", default=str(ROOT / "art-src"), help="output folder (default: art-src/)")
    ap.add_argument("--model", default="gpt-image-1", help="API model (default: gpt-image-1)")
    ap.add_argument("--quality", default="medium", choices=["low", "medium", "high"], help="API quality")
    ap.add_argument(
        "--codex-sandbox",
        choices=["read-only", "workspace-write", "danger-full-access"],
        help="sandbox mode for `codex exec` (danger-full-access turns Codex's sandbox off)",
    )
    ap.add_argument("--codex-arg", action="append", default=[], help="extra argument for `codex exec`, e.g. --codex-arg=--full-auto")
    args = ap.parse_args()

    style, items = parse_doc(DOC.read_text(encoding="utf-8"))
    if args.list:
        print("\n".join(f"{i.name:20} {i.size}" for i in items.values()))
        return
    names = list(items) if args.all else args.names
    if not names:
        ap.error("give one or more names, or --all (see --list)")
    unknown = [n for n in names if n not in items]
    if unknown:
        sys.exit(f"Unknown name(s): {', '.join(unknown)}. Use --list to see them.")

    codex_args = list(args.codex_arg)
    if args.codex_sandbox:
        codex_args = ["--sandbox", args.codex_sandbox, *codex_args]

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    failed = []
    for name in names:
        item = items[name]
        out = out_dir / f"{name}.png"
        prompt = full_prompt(style, item)
        if args.dry_run:
            print(f"===== {name}.png ({item.size}) =====\n{prompt}\n")
            continue
        if out.exists() and not args.force:
            print(f"- {name}: already exists, skipped (use --force to redo)")
            continue
        print(f"… {name} ({item.size}) via {args.backend}", flush=True)
        try:
            if args.backend == "api":
                generate_with_api(prompt, item.size, out, args.model, args.quality)
            else:
                generate_with_codex(prompt, item.size, out, codex_args)
            print(f"✓ {out}")
        except RuntimeError as e:
            failed.append(name)
            print(f"✗ {name}: {e}", file=sys.stderr)
    if failed:
        sys.exit(f"\nFailed: {', '.join(failed)}")
    if not args.dry_run:
        print("\nDone. Next: npm run art")


if __name__ == "__main__":
    main()
