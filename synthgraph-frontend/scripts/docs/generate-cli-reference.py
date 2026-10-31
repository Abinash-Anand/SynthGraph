"""Builds src/content/docs/cli/reference.mdx from the CLI's own --help output.

The reference is generated so it cannot drift from the tool. Run it after the CLI
changes, with the Python that has the SDK and CLI installed:

  python scripts/docs/generate-cli-reference.py
"""

import os
import re
import subprocess
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "src" / "content" / "docs" / "cli" / "reference.mdx"

env = dict(os.environ, COLUMNS="100", TERM="dumb", NO_COLOR="1")

# Run the CLI's entry point with the program name set to `synthgraph`. Going through
# the installed launcher would print `synthgraph.EXE` on Windows, and that wider name
# changes where the usage lines wrap.
ENTRY = "import sys; sys.argv[0] = 'synthgraph'; from synthgraph.cli.main import main; main()"


def help_of(words):
    out = subprocess.run(
        [sys.executable, "-c", ENTRY, *words, "--help"],
        capture_output=True,
        text=True,
        env=env,
        encoding="utf-8",
    )
    return out.stdout


def commands(text):
    """Names listed in a Commands box: lines like `| name   description |`."""
    names, in_box = [], False
    for line in text.splitlines():
        if line.startswith("+- Commands"):
            in_box = True
            continue
        if in_box:
            if line.startswith("+-"):
                break
            match = re.match(r"\|\s+([\w-]+)\s{2,}\S", line)
            if match:
                names.append(match.group(1))
    return names


def clean(text):
    return "\n".join(line.rstrip() for line in text.strip("\n").splitlines())


parts = [
    "Every command below is shown as the tool prints it with `--help`, so this page matches the version you have installed. "
    "Run `synthgraph --help`, or `synthgraph <command> --help`, to see the same text locally.\n",
    "## Global options\n\nThese go before the command: `synthgraph --json projects list`.\n",
    "```text\n" + clean(help_of([])) + "\n```\n",
]
for name in commands(help_of([])):
    subcommands = commands(help_of([name]))
    parts.append(f"## `synthgraph {name}`\n")
    if subcommands:
        for sub in subcommands:
            parts.append(f"### `synthgraph {name} {sub}`\n")
            parts.append("```text\n" + clean(help_of([name, sub])) + "\n```\n")
    else:
        parts.append("```text\n" + clean(help_of([name])) + "\n```\n")

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text("\n".join(parts), encoding="utf-8", newline="\n")
print("wrote", OUT)
