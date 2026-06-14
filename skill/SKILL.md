---
name: pdm-cli
description: Guide for using the pdm (project.md) CLI tool — markdown-based kanban project manager
---

# pdm CLI Skill

## Overview

`pdm` is a CLI tool that manages kanban projects entirely through the filesystem.
Projects are folders, kanbans are subfolders, columns are sub-subfolders, cards are `.md` files.

Root directory: `~/.project.md/` (override via `--dir <path>` or `PMD_DIR` env var).

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

**ID addressing**: Cards have an 8-char hex ID. Use it anywhere a path is needed:
```bash
pdm item show abc12345           # same as pdm item show project/kanban/column/file.md
pdm item mv abc12345 project/kanban/done
pdm checkbox toggle abc12345 hash1 hash2
```

### Project Management

| Command | Description |
| --- | --- |
| `pdm init` | Initialize root directory |
| `pdm project ls` | List all projects |
| `pdm project init <name>` | Create a project |
| `pdm project bind <name>` | **Bind cwd to a project** (creates `.pmd-link`, auto-prepends paths) |
| `pdm project unbind` | Remove binding |

### Kanban Management

| Command | Description |
| --- | --- |
| `pdm kanban ls <project>` | List kanbans in a project |
| `pdm kanban init <project>/<name>` | Create a kanban |
| `pdm kanban init <project>/<name> --bp` | Create with best-practice template (idea/todo/doing/done + hooks) |
| `pdm kanban show <project>/<name>` | **Overview**: all columns + card count + card IDs and names |
| `pdm kanban cols <project>/<name>` | List columns in a kanban |
| `pdm kanban rm <project>/<name>` | Delete a kanban |

### Card Management

| Command | Description |
| --- | --- |
| `pdm item ls <path>` | List cards in a column (`path` = project/kanban/column) |
| `pdm item new <path> <name> -d <desc>` | Create a card |
| `pdm item show <item_path>` | Show card detail (supports **ID**) |
| `pdm item mv <path> <dest_column_path>` | Move card (triggers hooks + done-column checkbox validation, supports **ID**) |
| `pdm item rm <item_path>` | **Move to trash** (not permanent! supports **ID**) |

### Checkbox Management

| Command | Description |
| --- | --- |
| `pdm checkbox ls <item_path>` | List all checkboxes (supports **ID**, shows depth hierarchy) |
| `pdm checkbox toggle <item_path> <hash>` | Toggle checkbox (supports **ID**) |
| `pdm checkbox toggle <item_path> <hash1> <hash2> <hash3>` | Toggle multiple at once |

**Multi-level support**: Checkboxes can be nested. Toggling a parent checkbox sets all children to the same state.
Hash is based on text + depth, so same text at different levels has different hashes.

### Working Directory Binding

When a project is bound (`pdm project bind <name>`), all path arguments are relative to that project:

```bash
cd /my/workspace
pdm project bind my-app

# Instead of:
pdm kanban show my-app/dev

# Just use:
pdm kanban show dev          # auto-prepends "my-app/"

pdm item ls dev/todo         # = my-app/dev/todo
pdm item new dev/todo "Task"
pdm kanban cols dev          # list columns
```

Output shows `[proj: xxx]` to indicate active binding.

To override binding and work with a different project, use `--force`:
```bash
pdm --force kanban show other-proj/kanban   # override binding for this command
```

**Blocked actions** when bound: `project init` (use `--force`), and any command referencing a different project.

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
1. Check what's available:       pdm kanban show <project>/<kanban>
2. Read a task:                  pdm item show <id>
3. Start working:                pdm item mv <id> <project>/<kanban>/doing
4. Tick subtasks:                pdm checkbox toggle <id> <hash1> <hash2>
5. Mark complete:                pdm item mv <id> <project>/<kanban>/done
```

## Edge Cases & Tips

### ID addressing
Card IDs are 8-char hex (e.g. `abc12345`). Use `pdm kanban show` to find IDs.
IDs are searched globally across all projects.

### Multi-level checkboxes
```
- [ ] parent
  - [ ] child              # hash differs from top-level child
    - [x] grandchild
```
Toggle parent → all children set to same state.
`checkbox ls` shows depth with indentation.

### Moving to "done" may be rejected
The `done` column has hooks that check all checkboxes must be completed.
If a move to `done` fails with "未完成的 checkbox", toggle remaining checkboxes first:
```bash
pdm checkbox toggle <item_path> <hash>
```

### Event log for debugging
```bash
pdm event ls <project> --limit 10
```

### Lock conflicts
CLI uses `events.jsonl`. Web frontend uses `events.web.jsonl` to avoid cross-process lock conflicts.
Both files are read by `pdm event ls` and the web UI.

### Best practice template
```bash
pdm kanban init <project>/dev --bp
```
Creates: `idea/` (idea parking), `todo/`, `doing/`, `done/` + default `.hooks/index.mjs`.
The `idea` column is for capturing ideas without deadlines. Cards only become actionable when moved to `todo`/`doing`.
The `done` column has built-in hooks to validate all checkboxes.

### Working directory binding
```bash
pdm project bind <name>    # creates .pmd-link in cwd
pdm project unbind         # removes it
```
When bound, all path arguments are auto-prepended with the project name.
Use `pdm kanban show dev` instead of `pdm kanban show my-app/dev`.
Output shows `[proj: xxx]` prefix.
Unbind to work with other projects.

### Path resolution
Paths in `item show` output and event logs are relative to `--dir`.
This makes them portable across machines.

## Examples (end-to-end)

```bash
# Init
pdm init
pdm project init my-app

# Kanban with best-practice template
pdm kanban init my-app/dev --bp

# Bind working directory
cd /my/project
pdm project bind my-app

# Add tasks (paths are relative)
pdm item new dev/todo "Add user login" -d "OAuth2 + JWT"
pdm item new dev/todo "Write tests"

# Start working (use IDs from kanban show)
pdm kanban show dev            # find card IDs
pdm item mv abc12345 dev/doing

# Toggle checkboxes
pdm checkbox toggle abc12345 hash1 hash2

# Finish
pdm item mv abc12345 dev/done

# View overview
pdm kanban show dev
```
