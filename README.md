# project.md

Markdown-based project manager. 文件夹即看板，markdown 即卡片，全文可迁移、可手动编辑、可版本控制。

## Quick Start

```bash
# 全局安装（已 link）
pdm init                          # 初始化 ~/.project.md/
pdm project init my-project       # 创建项目
pdm kanban init my-project/dev    # 创建设看板
pdm column init my-project/dev/todo my-project/dev/done  # 创建列
pdm item new my-project/dev/todo "实现登录" -d "用户登录功能"

# 查看
pdm item ls my-project/dev/todo
pdm item show temp/.projects/todomvc/tasks/pending/HTML\ Structure.md

# checkbox
pdm checkbox toggle <item-path> <hash>
pdm item mv <item-path> my-project/dev/done

# 事件日志
pdm event ls my-project --limit 10
```

## Core Concepts

| 概念 | 文件系统映射 |
| --- | --- |
| Root | `~/.project.md/`（`--dir` 可指定） |
| Project | `<root>/<project>/readme.md` 为项目上下文 |
| Kanban | `<project>/<kanban>/` 子目录 |
| Column | `<kanban>/<column>/` 子目录 |
| Item | `<column>/<name>.md` — YAML frontmatter + markdown 正文 |
| Checkbox | 卡片内的 `- [ ]` 行，通过 sha256 hash 标识 |
| Event Log | `<project>/events.jsonl` — 所有操作记录 |
| Hooks | `<kanban>/.hooks/index.mjs` — 自定义拦截器 |

## CLI Usage

```text
pdm <命令> [选项]

项目管理:
  init                              初始化根目录
  project ls                        列出项目
  project init <name>               创建项目
  project config <name>             查看项目配置
  project context <name>            查看项目 readme

看板管理:
  kanban ls <project>               列好看板
  kanban init <project>/<name>      创建看板
  kanban rm <project>/<name>        删除看板
  column ls <project>/<kanban>      列出列
  column init <project>/<kanban>/<col>

卡片管理:
  item ls <path>                    列出卡片
  item new <path> <name> [-d desc]  创建卡片
  item show <path>                  查看卡片详情
  item mv <path> <dest-column>      移动卡片（hooks 验证）
  item rm <path>                    删除卡片

Checkbox:
  checkbox ls <item-path>           列出 checkbox
  checkbox toggle <item-path> <hash...>  切换状态（支持多 hash）

事件查询:
  event ls <project> [--type] [--limit]
```

全局选项：`--dir <path>` 指定根目录（默认 `~/.project.md/`）。

## Web Frontend

`web/` — React + Zustand 前端，通过浏览器 File System Access API 直接读取本地目录。

```bash
cd web
pnpm install
pnpm dev          # 本地开发 http://localhost:5173
pnpm build        # → web/dist/
```

选择 `project.md` 根目录后，可查看看板、卡片详情、checkbox 状态、事件日志。3 秒自动轮询刷新。

## Hooks System

在 kanban 目录下创建 `.hooks/index.mjs`，导出以下函数即可拦截对应操作：

- `before_item_move`, `after_item_move`
- `before_item_create`, `after_item_create`
- `before_item_delete`, `after_item_delete`
- `before_checkbox_toggle`, `after_checkbox_toggle`

返回 `{ ok: false, message: "..." }` 阻止操作。详细见 `docs/product_design.md`。

## File Lock

所有 write-modify-write 操作使用基于 `mkdir` 的原子文件锁（`FileLock`），配合临时文件 + rename 实现原子写入，避免竞态。

## Development

```bash
pnpm install
pnpm build        # 构建 CLI → dist/
pnpm test         # vitest run
pnpm lint         # ESLint
npm link          # pdm 全局可用
```

## Project Structure

```text
src/
  index.ts                 CLI 入口（commander）
  commands/                命令实现
  core/                   核心逻辑
    project.ts, kanban.ts, column.ts, item.ts
    checkbox.ts, checklist.ts
    hooks.ts, event_log.ts
  utils/                  工具
    fs.ts, hash.ts, lock.ts, markdown.ts
web/                      React 前端（单独构建）
tests/                    Vitest 测试
docs/                     设计文档 / 开发规范
```

## Docs

- [产品设计](/docs/product_design.md)
- [开发规范](/docs/dev/ts.md)
- [BDD/TDD 流程](/docs/dev/bddtdd.md)

## License

MIT
