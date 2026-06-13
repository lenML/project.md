---
name: pdm-cli
description: Guide for using the pdm (project.md) CLI tool — markdown-based kanban project manager
---

# pdm CLI Skill

## Overview

`pdm` is a CLI tool that manages kanban projects entirely through the filesystem.
Projects are folders, kanbans are subfolders, columns are sub-subfolders, cards are `.md` files.

Root directory: `~/.project.md/` (override via `--dir <path>`).

## Quick Reference

```text
pdm --dir <root> <command> <subcommand> <args>
```

### Path Syntax

All paths are relative to `--dir`:

```
<project>                       # project name
<project>/<kanban>              # project/kanban
<project>/<kanban>/<column>     # column
<project>/<kanban>/<column>/<item_name>.md  # card file
```

**Important**: If filenames contain spaces, wrap the path in quotes:
```bash
pdm item show "my-project/dev/todo/My Card.md"
```

### Project Management

| Command | Description |
| --- | --- |
| `pdm init` | Initialize root directory |
| `pdm project ls` | List all projects |
| `pdm project init <name>` | Create a project |
| `pdm project config <name>` | Show project configuration |
| `pdm project context <name>` | Show project README |

### Kanban Management

| Command | Description |
| --- | --- |
| `pdm kanban ls <project>` | List kanbans in a project |
| `pdm kanban init <project>/<name>` | Create a kanban |
| `pdm kanban init <project>/<name> --bp` | Create kanban with best-practice template (idea/todo/doing/done + hooks) |
| `pdm kanban show <project>/<name>` | **Overview**: all columns + card count + card IDs and names |
| `pdm kanban rm <project>/<name>` | Delete a kanban |

### Column Management

| Command | Description |
| --- | --- |
| `pdm column ls <project>/<kanban>` | List columns |
| `pdm column init <project>/<kanban>/<col>` | Create a column |

### Card Management

| Command | Description |
| --- | --- |
| `pdm item ls <path>` | List cards in a column (`path` = project/kanban/column) |
| `pdm item new <path> <name> -d <desc>` | Create a card |
| `pdm item show <item_path>` | Show card detail, metadata, checkboxes, body, and **relative path** |
| `pdm item mv <path> <dest_column_path>` | Move card (triggers hooks + done-column checkbox validation) |
| `pdm item rm <item_path>` | **Move to trash** (not permanent!) |

### Checkbox Management

| Command | Description |
| --- | --- |
| `pdm checkbox ls <item_path>` | List all checkboxes with hash and checked status |
| `pdm checkbox toggle <item_path> <hash>` | Toggle a single checkbox |
| `pdm checkbox toggle <item_path> <hash1> <hash2> <hash3>` | **Toggle multiple checkboxes at once** |

Toggle is atomic — uses file lock + atomic write. Multiple hashes in one command are applied sequentially inside a single lock.

### Trash Management

| Command | Description |
| --- | --- |
| `pdm item rm <item_path>` | Move card to trash |
| `pdm item trash ls <kanban_path>` | List trashed items |
| `pdm item trash purge <item_path>` | Permanently delete from trash |

### Events

| Command | Description |
| --- | --- |
| `pdm event ls <project>` | List operation events (reverse chronological) |
| `pdm event ls <project> --limit 5` | Limit to 5 |
| `pdm event ls <project> --type item_move` | Filter by type |

Event types: `project_init`, `item_create`, `item_move`, `item_trash`, `item_delete`, `checkbox_toggle`

## Agent Workflow (Best Practice)

```text
1. Check what's available:  pdm kanban show <project>/<kanban>
2. Read a task:             pdm item show <item_path>
3. Start working:           pdm item mv <item_path> <project>/<kanban>/doing
4. Tick subtasks:           pdm checkbox toggle <item_path> <hash1> <hash2>
5. Mark complete:           pdm item mv <item_path> <project>/<kanban>/done
```

## Edge Cases & Tips

### Spaces in filenames
Always quote paths containing spaces:
```bash
pdm item show "my project/dev/todo/My card.md"
```

### Checklist creation
After creating a card with `pdm item new`, append checkboxes by editing the `.md` file directly:
```bash
echo "- [ ] subtask 1\n- [ ] subtask 2" >> <file.md>
```

Or use `pdm item show` first to get the path, then append with shell.

### Moving to "done" may be rejected
The `done` column has a **built-in rule**: all checkboxes must be completed.
If a move to `done` fails with "未完成的 checkbox", toggle remaining checkboxes first:
```bash
pdm checkbox toggle <item_path> <hash>
```

### Event log for debugging
```bash
pdm event ls <project> --limit 10
```

### Trash is not permanent
`pdm item rm` moves to trash. The trash lives at `<kanban>/.trash/`.
Trashed items can be viewed with `pdm item trash ls` and permanently deleted with `pdm item trash purge`.

### Hook system
Hooks live at `<kanban>/.hooks/index.mjs`. Create this file to intercept operations:
- Return `{ ok: false, message: "..." }` to block
- Return `{ ok: true }` to allow

### Best practice template
```bash
pdm kanban init <project>/dev --bp
```
Creates: `idea/` (idea parking), `todo/`, `doing/`, `done/` + default `.hooks/index.mjs`.

The `idea` column is for capturing ideas without deadlines. Cards only become actionable when moved to `todo`/`doing`.

### Path resolution
Paths in `item show` output and event logs are relative to `--dir`.
This makes them portable across machines.

### Lock conflicts
CLI uses `events.jsonl`. Web frontend uses `events.web.jsonl` to avoid cross-process lock conflicts.
Both files are read by `pdm event ls` and the web UI.

## Examples (end-to-end)

```bash
# Init
pdm init
pdm project init my-app

# Kanban with best-practice template
pdm kanban init my-app/dev --bp

# Add tasks
pdm item new my-app/dev/todo "Add user login" -d "OAuth2 + JWT"
echo -e "- [ ] design DB schema\n- [ ] implement route\n- [ ] add tests" >> "$(pdm item ls my-app/dev/todo | head -1 | awk '{print $2}')"

# Start working
pdm item mv my-app/dev/todo/"Add user login" my-app/dev/doing
# ... work ...
pdm checkbox toggle my-app/dev/doing/"Add user login.md" <hash>
# ... finish ...
pdm item mv my-app/dev/doing/"Add user login" my-app/dev/done

# View overview
pdm kanban show my-app/dev
```
