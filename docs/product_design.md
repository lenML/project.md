# project.md — 产品设计文档

版本: 0.1.0 | 状态: draft

## 产品愿景

基于 markdown 文件的项目管理工具。文件夹即看板，markdown 即卡片，全文可迁移、可手动编辑、可版本控制。

## 核心概念

| 概念 | 映射 | 说明 |
| --- | --- | --- |
| Root | `~/.project.md/` | 默认根目录, `--dir` 或 `PMD_DIR` 可覆盖 |
| Project | `<root>/<project>/` | 一个项目，包含一个或多个 kanban |
| Kanban | `<project>/<kanban>/` | 一个看板，包含多个 column |
| Column | `<kanban>/<column>/` | 一个状态列，包含多个 item |
| Item | `<column>/<file>.md` | YAML frontmatter + markdown 正文，8 位 hex ID |
| Checkbox | 卡片中的 `- [ ]` 行 | 子任务，通过 hash 标识，支持多级嵌套和父子联动 |
| Event Log | `<project>/events.jsonl` | append-only 操作记录 |
| Hooks | `<kanban>/.hooks/index.mjs` | 自定义拦截器（before/after 事件） |
| Trash | `<kanban>/.trash/` | 回收站，二次删除才永久删除 |
| Context | `<project>/readme.md` | 项目上下文 / YAML frontmatter 配置 |
| .pmdrc | 项目目录下的 `.pmdrc` | 类似 npmrc 的配置，向上遍历生效 |

## 目录结构

```
~/.project.md/
├── my-project/
│   ├── readme.md                    # project context / config
│   ├── events.jsonl                 # CLI 操作记录
│   ├── dev/                         # kanban: dev
│   │   ├── .hooks/index.mjs         # 钩子
│   │   ├── .trash/                  # 回收站
│   │   ├── todo/
│   │   │   ├── readme.md            # 列说明
│   │   │   └── 实现登录模块.md       # item
│   │   ├── doing/
│   │   │   └── ...
│   │   ├── done/
│   │   ├── backlog/                 # 待细化列
│   │   └── idea/                    # 想法列
│   └── bugs/
│       └── ...
```

## 文件格式

Item 卡片用 YAML frontmatter 分隔元数据：

```markdown
---
id: 8f3a2b1c                # short_hash(name + created_at)[:8]
name: 实现登录模块
desc: 用户登录功能
created_at: 2024-01-01T10:00:00+08:00
---
正文 markdown...

- [ ] 子任务             # hash: sha256(text + "|depth:N")[:8]
  - [x] 嵌套子任务       # 多级缩进，父子联动
```

项目 readme.md 也支持 YAML frontmatter，元数据作为项目配置。

## 事件日志

`events.jsonl` 每行一个 JSON 事件，字段：
- `id` / `timestamp` / `type` / `title` / `content` / `meta`

事件类型: `project_init`, `item_create`, `item_move`, `item_trash`, `item_delete`, `checkbox_toggle`, `column_update`

Web 端用 `events.web.jsonl` 避免与 CLI 文件锁冲突，格式相同。

## CLI 命令树

```
pmd {init,project,kanban,column,item,checkbox,event}
  project {ls,init,bind,unbind,config,context}
  kanban  {ls,init,show,cols,rm}       # init --bp 最佳实践
  item    {ls,new,show,mv,rm,import}   # rm → .trash 回收站
  checkbox {ls,toggle}                 # toggle 多 hash + 父子联动
  event   ls                           # --limit/--type/--offset
```

标志位: `-p project -k kanban -c col`
卡片支持 8 位 hex ID 全局寻址。

## .pmdrc 配置

```ini
project = my-project
kanban = dev
col = todo
```

向上目录遍历，子目录自动继承父级配置。优先级：CLI 标志 > .pmdrc > 默认。

## 项目绑定

`pmd project bind <name>` 在当前目录写入 `.pmdrc`，所有路径自动补全项目前缀，阻止访问其他项目（`--force` 覆盖）。

## Hooks 系统

每个 kanban 的 `.hooks/index.mjs` 导出：

| Hook | 类型 | 说明 |
| --- | --- | --- |
| `before_item_move` | before | 移动前校验，返回 `{ ok, message }` |
| `after_item_move` | after | 移动后通知 |
| `before_item_create` | before | 创建前校验 |
| `after_item_create` | after | 创建后通知 |
| `before_item_delete` | before | 删除前校验 |
| `after_item_delete` | after | 删除后通知 |
| `before_checkbox_toggle` | before | checkbox 切换前 |
| `after_checkbox_toggle` | after | checkbox 切换后 |

### 最佳实践钩子默认规则

- 移动方向：idea→backlog→todo→doing→done 主流程，允许后移
- todo/doing/done 列要求卡片必须有 checkbox
- done 列要求所有 checkbox 已完成
- done 是终点，不可移出

## 技术栈

- CLI: pnpm / TypeScript strict / commander / tsup
- Web: vite + React 19 + Zustand + File System Access API + TailwindCSS
- 测试: vitest
- 解析: unified / remark-parse / remark-gfm / js-yaml

## 开发约束

- `snake_case` 命名，`PascalCase` 类型
- ESM only（import 带 `.js` 后缀）
- TDD 优先（先 BDD 注释 → RED 测试 → 实现）
- CLI first，Web 是附属查看器
- 最小改动原则，不重构未涉及代码
- 一个 feature 一个 commit
- 勿用 `apply_patch`，使用 `apply-edits`

## 后续考虑

- 多用户/权限（SQLite + API key）
- 远程模式（HTTP API）
- WebSocket 实时同步
- npm 发布
