---
name: figma-mcp-efficiency
description: Use for Figma MCP work on Slides, presentation design, PDF export, or visual polishing when the task needs targeted reads, batched edits, and efficient verification.
---

# Figma MCP efficiency

Produce the requested result with the fewest Figma MCP calls that still allow accurate work. Reuse the conversation, earlier tool results, user screenshots, PDFs, and design specifications before reading Figma. Output quality and the user's requested scope take priority over the suggested call budget.

## Before opening Figma

- Prepare copy, slide structure, data, chart content, and visual direction outside Figma.
- Identify the smallest relevant page, frame, component, or node from an existing link or node ID.
- Decide what information a read must answer. Do not browse unrelated pages merely because tools are available.
- Follow any mandatory prerequisite skill for the particular Figma tool being called.

## Read only what is needed

- Aim for **0–2 Figma reads** and **0–1 screenshot or verification read** per task. These are defaults, not hard limits; inspect more when correctness requires it.
- Use `get_design_context` when the actual design structure is necessary. Use metadata only to locate an unknown target or narrow a large file; variables only for exact token values; screenshots only when visual evidence is needed.
- For a large deck, locate the relevant page and frame before reading. Inspect one representative slide or component when a shared pattern is enough, and expand only for meaningful differences.
- Treat prior results as cached context. Re-read a node only after a material edit, an incomplete result, a likely external change, or a verification need.

## Edit and verify

- Group independent changes into the fewest practical editing passes. Prepare titles, body copy, visuals, and alignment decisions before editing.
- Apply Figma to layout, component placement, visual hierarchy, design-system styling, and final formatting. Keep research, writing, translation, and content planning outside the canvas.
- Reuse established typography, spacing, color roles, card patterns, and footer styles instead of fetching identical values repeatedly.
- Verify once when layout relationships, overflow, pixel-level accuracy, or a user request requires it. Prefer an existing screenshot or exported PDF when it answers the question. Collect any corrections and make one focused follow-up pass.
- Stop when the requested edits and needed verification are complete. Do not reopen an unchanged frame just to reconfirm it.

The [original user-provided guidance](references/original-guidance.txt) preserves the full 20-section source for unusually detailed Slides or export workflows; ordinary tasks should use this entrypoint alone.
