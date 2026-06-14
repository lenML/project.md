---
name: pmd-cli
description: Guide for using the pmd (project.md) CLI tool — markdown-based kanban project manager
---

# pmd CLI Skill

## Overview

`pmd` is a CLI tool that manages kanban projects entirely through the filesystem.
Projects are folders, kanbans are subfolders, columns are sub-subfolders, cards are `.md` files.

Root directory: `~/.project.md/` (override via `--dir <path>` or `PMD_DIR` env var).

## Quick Reference

```text
pmd --dir <root> <command> <subcommand> <args>
```

### Path Syntax

All paths are relative to `--dir`:

```
<name>                          # kanban name (use -p/--project)
-p/--project                    # specify project
-k/--kanban                     # specify kanban
-c/--col                        # specify column
```

**ID addressing**: Cards have an 8-char hex ID. Use it anywhere a path is needed:
```bash
pmd item show abc12345           # use --project --kanban --col to locate
pmd -p myproject -k mykanban -c done item mv abc12345
pmd checkbox toggle abc12345 hash1 hash2
```

### Project Management

| Command | Description |
| --- | --- |
| `pmd init` | Initialize root directory |
| `pmd project ls` | List all projects |
| `pmd project init <name>` | Create a project |
| `pmd project bind <name>` | **Bind cwd to a project** (writes `.pmdrc`, auto-prepends paths) |
| `pmd project unbind` | Remove binding |

### Kanban Management

| Command | Description |
| --- | --- |
| `pmd kanban ls` | List kanbans (use -p/--project) |
| `pmd kanban init <name>` | Create a kanban (use -p/--project) |
| `pmd kanban init <name> --bp` | Create with best-practice template (use -p/--project) |
| `pmd kanban show` | Kanban overview (use -p/--project -k/--kanban) |
| `pmd kanban cols` | List columns (use -p/--project -k/--kanban) |
| `pmd kanban rm <name>` | Delete a kanban (use -p/--project) |

### Card Management

| Command | Description |
| --- | --- |
| `pmd item ls` | List cards (use -p/--project -k/--kanban -c/--col) |
| `pmd item new <path> <name> -d <desc>` | Create a card |
| `pmd item show <id>` | Show card detail (supports **ID**) |
| `pmd item mv <path> <dest_column_path>` | Move card (triggers hooks + done-column checkbox validation, supports **ID**) |
| `pmd item rm <item_path>` | **Move to trash** (not permanent! supports **ID**) |

### Checkbox Management

| Command | Description |
| --- | --- |
| `pmd checkbox ls <id>` | List all checkboxes (supports **ID**, shows depth hierarchy) |
| `pmd checkbox toggle <id> <hash>` | Toggle checkbox (supports **ID**) |
| `pmd checkbox toggle <item_path> <hash1> <hash2> <hash3>` | Toggle multiple at once |

**Multi-level support**: Checkboxes can be nested. Toggling a parent checkbox sets all children to the same state.
Hash is based on text + depth, so same text at different levels has different hashes.

### Working Directory Binding

When a project is bound (`pmd project bind <name>`), all path arguments are relative to that project:

```bash
cd /my/workspace
pmd project bind my-app

# Instead of:
pmd kanban show my-app/dev

# Just use:
pmd kanban show dev          # auto-prepends "my-app/"

pmd item ls dev/todo         # = my-app/dev/todo
pmd item new dev/todo "Task"
pmd kanban cols dev          # list columns
```

Output shows `[proj: xxx]` to indicate active binding.

To override binding and work with a different project, use `--force`:
```bash
pmd --force kanban show other-proj/kanban   # override binding for this command
```

**Blocked actions** when bound: `project init` (use `--force`), and any command referencing a different project.

### Trash Management

| Command | Description |
| --- | --- |
| `pmd item rm <item_path>` | Move card to trash |
| `pmd item trash ls <kanban_path>` | List trashed items |
| `pmd item trash purge <item_path>` | Permanently delete from trash |

### Events

| Command | Description |
| --- | --- |
| `pmd event ls` | List operation events (use -p/--project) |
| `pmd event ls --limit 5` | Limit to 5 (use -p/--project) |
| `pmd event ls --type item_move` | Filter by type (use -p/--project) |

Event types: `project_init`, `item_create`, `item_move`, `item_trash`, `item_delete`, `checkbox_toggle`

## Agent Workflow (Best Practice)

```text
1. Check what's available:       pmd -p <project> -k <kanban> kanban show
2. Read a task:                  pmd item show <id>
3. Start working:                pmd -p <project> -k <kanban> -c doing item mv <id>
4. Tick subtasks:                pmd checkbox toggle <id> <hash1> <hash2>
5. Mark complete:                pmd -p <project> -k <kanban> -c done item mv <id>
```

## Edge Cases & Tips

### ID addressing
Card IDs are 8-char hex (e.g. `abc12345`). Use `pmd kanban show` to find IDs.
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
pmd checkbox toggle <item_path> <hash>
```

### Event log for debugging
```bash
pmd -p project event ls --limit 10
```

### Lock conflicts
CLI uses `events.jsonl`. Web frontend uses `events.web.jsonl` to avoid cross-process lock conflicts.
Both files are read by `pmd event ls` and the web UI.

### Best practice template
```bash
pmd -p project kanban init dev --bp
```
Creates: `idea/` (idea parking), `todo/`, `doing/`, `done/` + default `.hooks/index.mjs`.
The `idea` column is for capturing ideas without deadlines. Cards only become actionable when moved to `todo`/`doing`.
The `done` column has built-in hooks to validate all checkboxes.

### Working directory binding — 路径简写

绑定后路径**不需要写项目前缀**，CLI 自动补全：

```bash
cd /my/workspace
pmd project bind my-app

# 绑定前需写完整路径：
#   pmd item new my-app/dev/todo "任务"
#   pmd kanban show my-app/dev

# 绑定后省略项目名：
pmd item new dev/todo "任务"
pmd kanban show dev
pmd kanban show              # 不指定 kanban 时显示项目所有看板概览
pmd item ls dev/todo
```

显式写完整路径 `my-app/dev` 也支持（自动去重，不会双倍补全）。  
`[proj: xxx]` 前缀表示当前绑定状态。

**阻止跨项目**：绑定状态下访问其他项目会报错，用 `--force` 覆盖：

```bash
pmd --force kanban show other-proj/kanban
```

绑定状态下 `project init` 也会被阻止（需 `--force` 或先 `project unbind`）。

### .pmdrc 配置文件

`.pmdrc` 类似 npmrc，支持向上目录遍历：

```ini
project = my-project    # 默认项目
kanban = dev            # 默认看板
col = todo              # 默认列
```

配置继承关系：CLI 标志 > `.pmdrc` > 旧 `.pmd-link`
`.pmdrc` 放在项目根目录，子目录下自动继承。

### Path resolution
Paths in `item show` output and event logs are relative to `--dir`.
This makes them portable across machines.

## Examples (end-to-end)

```bash
# Init
pmd init
pmd project init my-app

# Kanban with best-practice template
pmd kanban init my-app/dev --bp

# Bind working directory
cd /my/project
pmd project bind my-app

# Add tasks (paths are relative)
pmd item new dev/todo "Add user login" -d "OAuth2 + JWT"
pmd item new dev/todo "Write tests"

# Start working (use IDs from kanban show)
pmd kanban show dev            # find card IDs
pmd item mv abc12345 dev/doing

# Toggle checkboxes
pmd checkbox toggle abc12345 hash1 hash2

# Finish
pmd item mv abc12345 dev/done

# View overview
pmd kanban show dev
```
