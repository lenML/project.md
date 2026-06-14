# project.md

Markdown-based project manager. 文件夹即看板，markdown 即卡片，全文可迁移、可手动编辑、可版本控制。

## Quick Start

```bash
# 全局安装（已 link）
pdm init                          # 初始化 ~/.project.md/
pdm project init my-project       # 创建项目
pdm kanban init my-project/dev    # 创建设看板
pdm kanban init my-project/dev --bp  # 最佳实践看板（idea/todo/doing/done + hooks）
pdm item new my-project/dev/todo "实现登录" -d "用户登录功能"

# 查看
pdm kanban show my-project/dev    # 看板概览（含卡片 ID）
pdm item ls my-project/dev/todo

# 通过 ID 操作卡片
pdm item show <id>                # 8 位 hex ID，无需完整路径
pdm item mv <id> my-project/dev/done
pdm checkbox toggle <id> <hash>

# checkbox
pdm checkbox ls <item-path>       # 支持多级 checkbox，按层级缩进
pdm checkbox toggle <item-path> <hash1> <hash2>  # toggle 父级时子级联动

# 工作目录绑定
cd my-project
pdm project bind my-project       # 绑定当前目录到项目
pdm kanban show dev               # 路径自动补全
pdm --force kanban ls other-project  # 覆盖绑定访问其他项目
pdm project unbind                # 解除绑定

# 事件日志
pdm event ls my-project --limit 10
```

## Core Concepts

| 概念 | 文件系统映射 |
| --- | --- |
| Root | `~/.project.md/`（`--dir` 可指定，`PMD_DIR` 环境变量） |
| Project | `<root>/<project>/readme.md` 为项目上下文 |
| Kanban | `<project>/<kanban>/` 子目录 |
| Column | `<kanban>/<column>/` 子目录 |
| Item | `<column>/<name>.md` — YAML frontmatter + markdown 正文 |
| Checkbox | 卡片内的 `- [ ]` 行，通过 sha256 hash 标识，支持多级嵌套 |
| Event Log | `<project>/events.jsonl` — 所有操作记录 |
| Hooks | `<kanban>/.hooks/index.mjs` — 自定义拦截器 |

## CLI Usage

```text
pdm <命令> [选项]

全局选项:
  --dir <path>    项目根目录（默认 ~/.project.md/，可用 PMD_DIR 环境变量）
  --force         跳过项目绑定检查（用于绑定状态下访问其他项目）
  -V, --version   版本

项目管理:
  init                            初始化根目录
  project ls                      列出项目
  project init <name>             创建项目
  project config <name>           查看项目配置
  project context <name>          查看项目 readme
  project bind <name>             绑定当前目录到项目（创建 .pmd-link）
  project unbind                  解除绑定

看板管理:
  kanban ls <project>             列出看板
  kanban init <project>/<name>    创建看板（--bp 最佳实践模板）
  kanban show [project/]<name>   看板概览（绑定后可省略路径，显示所有看板）
  kanban cols <project>/<name>    列出看板下的列
  kanban rm <project>/<name>      删除看板

列管理:
  column ls <path>                列出列
  column init <path>              创建列

卡片管理:
  item ls <path>                  列出卡片（支持绑定路径）
  item new <path> <name> [-d desc] 创建卡片
  item show <item_path>           查看卡片详情（支持 ID）
  item mv <item_path> <dest-column> 移动卡片（hooks 验证，支持 ID）
  item rm <item_path>             移入回收站（支持 ID）

  item trash ls <kanban_path>     列出回收站
  item trash purge <item_path>    永久删除（支持 ID）

Checkbox:
  checkbox ls <item_path>         列出 checkbox（支持 ID，按层级缩进）
  checkbox toggle <item_path> <hash...> 切换状态（支持多 hash，支持 ID）
                                     toggle 父级时子级联动

事件查询:
  event ls <project> [--type] [--limit]
```

## Working Directory Binding

```bash
pdm project bind my-project        # 创建 .pmd-link 绑定文件
cd /any/where
pdm kanban show dev                # 自动补全为 my-project/dev
pdm item new dev/todo "Task"       # 自动补全路径
pdm project unbind                 # 解除
```

绑定后路径**不需要写项目前缀**，CLI 自动补全。绑定状态下访问其他项目会被拒绝：

```bash
pdm kanban ls                    # 列出绑定项目的看板
pdm kanban show                  # 绑定项目所有看板概览
pdm kanban show dev              # = my-project/dev
pdm kanban ls other-project      # Error: bound to "my-project", refusing "other-project"
pdm --force kanban ls other-project  # 使用 --force 覆盖
```

`project ls` 中绑定项目会标记 `*`。`project init` 在绑定状态下也会被阻止（需 `--force` 或先 `project unbind`）。

## ID Addressing

所有卡片创建时自动生成 8 位 hex ID。后续可通过 ID 操作：

```bash
pdm kanban show my-project/dev     # 查看卡片 ID
pdm item show abc12345             # 无需完整路径
pdm item mv abc12345 my-project/dev/done
pdm checkbox toggle abc12345 hash1 hash2
pdm item rm abc12345
```

ID 全局唯一搜索，跨项目可用。

## Multi-level Checkbox

checkbox 支持多级嵌套：

```markdown
- [ ] parent task
  - [ ] child subtask A
  - [x] child subtask B
    - [ ] grandchild task
```

- `checkbox ls` 按缩进显示层级
- toggle 父级时，所有子级设为相同状态（联动）
- 子级 hash 基于 `text + depth` 生成，同级同名文本正确区分
- done 列的 hooks 自动检查所有 checkbox 是否完成

## Web Frontend

`web/` — React + Zustand 前端，通过浏览器 File System Access API 直接读取本地目录。

```bash
cd web
pnpm install
pnpm dev          # 本地开发 http://localhost:5173
pnpm build        # → web/dist/
```

选择 `project.md` 根目录后，可查看看板、卡片详情、checkbox 状态、事件日志。
支持编辑模式、拖拽移动、搜索筛选、分页加载、可收起终端日志。

## Hooks System

在 kanban 目录下创建 `.hooks/index.mjs`，导出以下函数即可拦截对应操作：

- `before_item_move`, `after_item_move`
- `before_item_create`, `after_item_create`
- `before_item_delete`, `after_item_delete`
- `before_checkbox_toggle`, `after_checkbox_toggle`

返回 `{ ok: false, message: "..." }` 阻止操作。最佳实践模板包含 done 列自动 checkbox 校验。

## Development

```bash
pnpm install
pnpm build        # 构建 CLI → dist/
pnpm test         # vitest run
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
npm link          # pdm 全局可用
```

## Project Structure

```text
src/
  index.ts                 CLI 入口（commander）
  commands/                命令实现
  core/                    核心逻辑
    project.ts, kanban.ts, column.ts, item.ts
    checkbox.ts, checklist.ts
    hooks.ts, event_log.ts, template.ts, trash.ts
  utils/                  工具
    fs.ts, hash.ts, lock.ts, markdown.ts
web/                      React 前端（单独构建）
tests/                    Vitest 测试
docs/                     设计文档 / 开发规范
skill/SKILL.md            CLI 使用技能文档（面向 AI agent）
```

## License

MIT
