---
name: log-transcript
description: >-
  Save the current Claude Code conversation as a text-only transcript into
  docs/transcript-logs/, titled with a summary of the conversation and led by a
  one-paragraph summary. Use when asked to "log this conversation", "save the
  transcript", "log-transcript", or to keep a record of a working session so the
  RESPONSES.md questions can be answered from real history.
allowed-tools:
  - Bash
  - Read
  - Write
---

# Log transcript

Capture the **current session** as a readable transcript in `docs/transcript-logs/`.
These logs are the raw material for writing thorough `RESPONSES.md` answers, so favor
faithfulness over brevity in the transcript body.

## Procedure

1. **Extract the transcript.** From the repo root, run:

   ```bash
   python3 .claude/skills/log-transcript/extract_transcript.py
   ```

   It locates this project's newest-mtime session JSONL under
   `~/.claude/projects/<escaped-cwd>/`, strips all tool calls / tool results /
   harness noise, and prints prose-only `## User` / `## Claude` turns. The first
   lines (`# title:` / `# source:`) are metadata — use the title as a seed, then
   drop both lines from the transcript body you save.

2. **Compose the title and summary.** Read the extracted output and write:
   - a **title** that summarizes what the conversation was about (a real summary,
     not just "conversation log"); and
   - a **one-paragraph summary** (3–6 sentences) of what was discussed and decided.

3. **Pick the filename.** Build a kebab-case slug from the title and prefix it with
   today's date for ordering:

   ```bash
   date +%F   # e.g. 2026-05-23
   ```

   → `docs/transcript-logs/<YYYY-MM-DD>-<slug>.md`. If that path already exists,
   append `-2`, `-3`, … so you never clobber an earlier log.

4. **Write the file** in exactly this shape:

   ```markdown
   # <Title — a summary of the conversation>

   <one-paragraph summary>

   ---

   ## User

   <first user turn…>

   ## Claude

   <first claude turn…>

   …
   ```

   (The transcript body is the extractor output with the leading `# title:` /
   `# source:` metadata lines removed.)

5. **Report** the written path back to the user.

## Notes

- "Current session" = the newest-mtime `*.jsonl` in the project's transcript dir,
  which is the session this skill runs in. To log a *different* session, pass its
  path as the script's first argument.
- Text-only by design: tool inputs/outputs are intentionally excluded for readability.
