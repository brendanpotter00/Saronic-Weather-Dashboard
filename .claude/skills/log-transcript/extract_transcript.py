#!/usr/bin/env python3
"""Extract a text-only transcript from a Claude Code session JSONL.

Reads the current project's session log (newest-mtime *.jsonl under
~/.claude/projects/<escaped-cwd>/, or a path passed as argv[1]) and prints a
readable User/Claude transcript: assistant + user *prose only*, with all
tool_use / tool_result blocks and injected harness noise stripped out.

Also prints the session's generated title (if any) as a `# title:` line at the
top so the calling skill can seed its summary title. Dependency-free; stdlib only.
"""
from __future__ import annotations

import glob
import json
import os
import re
import sys

# Harness-injected wrappers that aren't real conversation prose.
_SYSTEM_REMINDER = re.compile(r"<system-reminder>.*?</system-reminder>", re.DOTALL)
_COMMAND_TAGS = re.compile(
    r"</?(command-name|command-message|command-args|local-command-stdout|"
    r"command-contents)>",
)


def session_dir_for_cwd() -> str:
    """Map the current working directory to its ~/.claude/projects/ folder."""
    cwd = os.getcwd()
    escaped = cwd.replace("/", "-")
    return os.path.join(os.path.expanduser("~/.claude/projects"), escaped)


def newest_jsonl(directory: str) -> str | None:
    files = glob.glob(os.path.join(directory, "*.jsonl"))
    if not files:
        return None
    return max(files, key=os.path.getmtime)


def clean(text: str) -> str:
    text = _SYSTEM_REMINDER.sub("", text)
    text = _COMMAND_TAGS.sub("", text)
    return text.strip()


def text_from_content(content) -> str:
    """Pull only human-readable text out of a message's content."""
    if isinstance(content, str):
        return clean(content)
    if not isinstance(content, list):
        return ""
    parts: list[str] = []
    for block in content:
        if not isinstance(block, dict):
            if isinstance(block, str):
                parts.append(block)
            continue
        # Keep prose; drop tool_use and tool_result blocks entirely.
        if block.get("type") == "text" and isinstance(block.get("text"), str):
            parts.append(block["text"])
    return clean("\n".join(parts))


def main() -> int:
    path = sys.argv[1] if len(sys.argv) > 1 else newest_jsonl(session_dir_for_cwd())
    if not path or not os.path.exists(path):
        sys.stderr.write(
            "No session transcript found. Pass a .jsonl path as the first argument.\n"
        )
        return 1

    title = ""
    turns: list[tuple[str, str]] = []  # (speaker, text)

    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue

            kind = obj.get("type")
            if kind == "ai-title" and not title:
                title = (obj.get("title") or obj.get("message") or "").strip()
                continue
            if kind not in ("user", "assistant"):
                continue
            if obj.get("isSidechain"):  # subagent side-conversations
                continue

            message = obj.get("message") or {}
            role = message.get("role", kind)
            body = text_from_content(message.get("content"))
            if not body:
                continue
            speaker = "Claude" if role == "assistant" else "User"
            turns.append((speaker, body))

    out: list[str] = []
    if title:
        out.append(f"# title: {title}")
        out.append("")
    out.append(f"# source: {os.path.basename(path)}")
    out.append("")
    for speaker, body in turns:
        out.append(f"## {speaker}")
        out.append("")
        out.append(body)
        out.append("")

    sys.stdout.write("\n".join(out).rstrip() + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
