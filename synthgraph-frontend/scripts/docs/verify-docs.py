"""Runs the code in the documentation against a real backend.

Conventions in the MDX files under src/content/docs:

  ```python   is executed. All python blocks of one page run in order, as one script.
  ```py       is illustrative and is not executed.
  ```bash     lines that start with `synthgraph ` are checked against the CLI's own --help:
              the command must exist and every --option used must be listed.

Usage (from synthgraph-frontend, with the SDK installed in the Python you run this with):

  export SYNTHGRAPH_API_KEY=...        # a key for a throwaway account
  export SYNTHGRAPH_API_URL=http://localhost:3000
  python scripts/docs/verify-docs.py                 # every page
  python scripts/docs/verify-docs.py sdk/lineage.mdx # one page

Use a local backend and a throwaway account: the examples create projects. The backend
allows about 120 requests a minute per key, so the script pauses between pages.
"""

import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

DOCS = Path(__file__).resolve().parents[2] / "src" / "content" / "docs"
CLI = shutil.which("synthgraph")

# The documentation's samples call the user's own pipeline; stand in for it.
PRELUDE = """
def run_my_blender_pipeline():
    pass
"""

FENCE = re.compile(r"^```(\w+)[^\n]*\n(.*?)^```", re.S | re.M)


def fences(text):
    return [(m.group(1), m.group(2)) for m in FENCE.finditer(text)]


def check_cli(line):
    if CLI is None:
        return ["the synthgraph command is not on PATH, so CLI examples cannot be checked"]
    tokens = line.split()
    words = []
    for token in tokens[1:]:
        if token.startswith(("<", "-", "#")):
            break
        words.append(token)
    out = subprocess.run([CLI, *words, "--help"], capture_output=True, text=True, encoding="utf-8")
    help_text = re.sub(r"\s+", " ", out.stdout + out.stderr)
    problems = []
    if out.returncode != 0:
        problems.append(f"`synthgraph {' '.join(words)} --help` exited {out.returncode}")
    for token in tokens[1 + len(words):]:
        if token.startswith("--") and token != "--help" and token not in help_text:
            root = subprocess.run([CLI, "--help"], capture_output=True, text=True, encoding="utf-8").stdout
            if token not in root:
                problems.append(f"option {token} not found for `synthgraph {' '.join(words)}`")
    return problems


def run_page(path):
    rel = path.relative_to(DOCS).as_posix()
    blocks = fences(path.read_text(encoding="utf-8"))
    python_blocks = [code for lang, code in blocks if lang == "python"]
    problems = []
    if python_blocks:
        script = PRELUDE + "\n".join(python_blocks)
        result = subprocess.run([sys.executable, "-I", "-"], input=script, capture_output=True, text=True, timeout=180, env=os.environ)
        if result.returncode != 0:
            problems.append("python failed:\n" + (result.stderr or result.stdout)[-900:])
    for lang, code in blocks:
        if lang == "bash":
            for line in code.splitlines():
                line = line.strip().lstrip("$ ").strip()
                if line.startswith("synthgraph ") and "--version" not in line:
                    problems += check_cli(line)
    return rel, len(python_blocks), problems


if __name__ == "__main__":
    for needed in ("SYNTHGRAPH_API_KEY", "SYNTHGRAPH_API_URL"):
        if not os.environ.get(needed):
            sys.exit(f"{needed} is not set")
    only = set(sys.argv[1:])
    pages = [p for p in sorted(DOCS.rglob("*.mdx")) if not only or p.relative_to(DOCS).as_posix() in only]
    failed = 0
    for index, page in enumerate(pages):
        rel, count, problems = run_page(page)
        failed += bool(problems)
        print(f"[{'FAIL' if problems else 'ok'}] {rel}  ({count} python block(s))", flush=True)
        for problem in problems:
            print("   ", problem.replace("\n", "\n    "), flush=True)
        if count and index < len(pages) - 1:
            time.sleep(22)  # stay under the API's request limit
    print("FAILED PAGES:", failed)
    sys.exit(1 if failed else 0)
