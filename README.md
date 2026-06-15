# project.md

Markdown-based project manager. 文件夹即看板，markdown 即卡片，全文可迁移、可手动编辑、可版本控制。

## Quick Start

```bash
# 全局安装（已 link）
pmd init                          # 初始化 ~/.project.md/
pmd project init my-project       # 创建项目

# 标志式定位：-p project -k kanban -c col
pmd -p my-project kanban init dev            # 创建看板
pmd -p my-project -k dev kanban show         # 看板概览
pmd -p my-project -k dev -c todo item ls     # 查看任务

# 通过 ID 操作卡片
pmd item show <id>
pmd -p my-project -k dev -c done item mv <id>     # 移动到 done
pmd checkbox toggle <id> <hash>

# 绑定后 -p 可省略
cd my-project
pmd project bind my-project       # 绑定当前目录到项目
pmd -k dev kanban show            # -p 自动从绑定读取
pmd -k dev -c todo item new "实现登录" -d "用户登录功能"
pmd --force -p other-project kanban ls  # 覆盖绑定访问其他项目
pmd project unbind                # 解除绑定

# 事件日志
pmd -p my-project event ls --limit 10
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
pmd <命令> [选项]

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
  project bind <name>             绑定当前目录到项目（写入 .pmdrc project=）
  project unbind                  解除绑定

看板管理:
  kanban ls                       列出看板（使用 -p/--project）
  kanban init <name>              创建看板（使用 -p/--project，--bp）
  kanban show                    看板概览（使用 -p -k，--all 显示全部，默认限 10 条）
  kanban cols                     列出看板下的列（使用 -p/--project -k/--kanban）
  kanban rm <name>                删除看板（使用 -p/--project）

列管理:
  column ls                       列出列（使用 -p/--project -k/--kanban）
  column init <name>              创建列（使用 -p/--project -k/--kanban）
  column readme <name>            查看列 readme（使用 -p/--project -k/--kanban）

卡片管理:
  item ls                         列出卡片（使用 -p -k -c，--limit N 限条数）
  item new <name> [-d desc]       创建卡片（使用 -p -k -c）
  item show <id>                  查看卡片详情（支持 8 位 hex ID）
  item mv <id>                    移动卡片（使用 -c 指定目标列）
  item rm <id>                    移入回收站（支持 ID）

  item trash ls                   列出回收站（使用 -p -k）
  item trash purge <id>           永久删除（支持 ID）

Checkbox:
  checkbox ls <id>                列出 checkbox（支持 ID）
  checkbox toggle <id> <hash...>  切换状态（支持多 hash）
                                     toggle 父级时子级联动

事件查询:
  event ls [--type] [--limit]     （使用 -p/--project）
```

## Working Directory Binding

```bash
pmd project bind my-project        # 创建 .pmdrc 绑定文件
cd /any/where
pmd -k dev kanban show             # -p 自动从绑定读取
pmd -k dev -c todo item new "Task"
pmd project unbind                 # 解除
```

绑定后 `-p` 可省略（自动从绑定读取），但访问其他项目会被拒绝：

```bash
pmd -p my-project kanban ls        # 列出绑定项目的看板
pmd -p my-project -k dev kanban show
pmd -p other-project kanban ls     # Error: bound
pmd --force -p other-project kanban ls  # 使用 --force
```

`project ls` 中绑定项目会标记 `*`。`project init` 在绑定状态下也会被阻止（需 `--force` 或先 `project unbind`）。

## PMD_DIR 环境变量

设置 `PMD_DIR` 可改变默认根目录，优先级低于 `--dir`：

```bash
export PMD_DIR=/path/to/projects   # Linux/macOS
```

```powershell
$env:PMD_DIR = "D:\\pmd"         # Windows
```

不设置时默认 `~/.project.md/`。

## .pmdrc 配置文件

`.pmdrc` 类似 npmrc，支持向上目录遍历。当前目录没有时自动向上查找：

```ini
project = my-project    # 默认项目（CLI --project 覆盖）
kanban = dev            # 默认看板（CLI --kanban 覆盖）
col = todo              # 默认列（CLI --col 覆盖）
```

- CLI 标志 > `.pmdrc` > 旧 `.pmd-link`（向后兼容）
- `.pmdrc` 放在项目根目录，子目录自动继承配置
- `project bind` 写入 `.pmdrc` 的 `project` 字段
- `project unbind` 移除 `project` 字段，不影响其他 key
- 设了 `kanban` 或 `col` 后可省略对应 CLI 标志

## ID Addressing

所有卡片创建时自动生成 8 位 hex ID。后续可通过 ID 操作：

```bash
pmd -p my-project -k dev kanban show     # 查看卡片 ID
pmd item show abc12345                   # 无需完整路径
pmd -p my-project -k dev -c done item mv abc12345
pmd checkbox toggle abc12345 hash1 hash2
pmd item rm abc12345
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
npm link          # pmd 全局可用
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
