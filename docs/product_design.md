---
id: product_design
title: 产品设计
version: 0.1.0
status: draft
---

# project.md — 产品设计文档

## 产品愿景

基于 markdown 文件的项目管理工具。文件夹即看板，markdown 即卡片，全文可迁移、可手动编辑、可版本控制。

## 核心概念

| 概念 | 映射 | 说明 |
| --- | --- | --- |
| **Root** | `~/.project.md/` | 默认根目录，CLI 可通过 `--dir` 指定其他路径 |
| **Project** | `<root>/<project>/` | 一个项目，包含一个或多个 kanban 看板 |
| **Kanban** | `<project>/<kanban>/` | 一个看板，包含多个 column（状态列） |
| **Column** | `<kanban>/<column>/` | 一个状态列，包含多个 item（卡片） |
| **Item** | `<column>/<file>.md` | 一张卡片，含 yaml metadata + markdown 正文 |
| **Checkbox** | 卡片中的 `- [ ]` 行 | 卡片内的子任务，通过 hash 标识 |
| **Context** | `<project>/readme.md` | 项目的全局上下文，所有 kanban 共享可见 |

## 目录结构

```
~/.project.md/
├── my-project/
│   ├── readme.md                    # project context
│   ├── dev/                         # kanban: dev
│   │   ├── todo/                    # column
│   │   │   └── api设计-20240101.md   # item
│   │   ├── in_progress/
│   │   │   └── 实现登录模块.md
│   │   └── done/
│   └── bugs/                        # kanban: bugs
│       ├── open/
│       └── closed/
│           └── 登录页面报错.md
└── another-project/
    ├── readme.md
    └── ...
```

### 规则

- **不允许空 name**：kanban、column、item 文件夹/文件名不能为空
- **深度限制**：CLI 最多递归到 item 层（4层：root → project → kanban → column → item）。更深层的文件夹忽略
- **排序**：默认按文件名拼音/字母序排序，后续可引入 `.ordering` 排序文件
- **项目名**：文件夹名即项目名、看板名、列名。不允许重名 project

## 文件格式

### Item 卡片（.md）

```markdown
---
id: 8f3a2b1c                # sha256(name + created_at)[:8]
name: 实现登录模块
desc: 完成用户登录功能，包含表单校验和 token 管理
created_at: 2024-01-01T10:00:00+08:00
updated_at: 2024-01-02T15:30:00+08:00
---

## 需求

用户输入账号密码，点击登录后获取 token。

## 任务列表

- [ ] 前端表单校验
- [ ] 后端接口对接
- [x] 错误提示优化
```

**metadata 字段**

| 字段 | 必需 | 说明 |
| --- | --- | --- |
| `name` | 是 | 卡片标题 |
| `desc` | 否 | 卡片简述 |
| `created_at` | 是 | ISO 8601 时间戳 |
| `updated_at` | 否 | ISO 8601 时间戳 |
| `id` | 是 | 8 位十六进制，`sha256(name + created_at)[:8]` |
| `tags` | 否 | 标签列表，`tags: [bug, urgent]` |
| `assignee` | 否 | 负责人 |

### Context 项目上下文（readme.md）

项目的 readme.md 不包含 yaml metadata，纯 markdown。内容在对应项目的任何 CLI 操作中作为上下文展示。

### Checkbox 系统

**标识方式**：对 checkbox 文本做 `sha256(text.trim())[:8]`。文本不变 ID 不变，文本修改 ID 变化（视为新 checkbox）。

**状态**：仅通过文件中的 `- [ ]` / `- [x]` 标记。CLI 查询时扫描文件解析，不依赖外部存储。

**CLI 操作**：

- `pdm checkbox ls <item_path>` — 列出所有 checkbox 及 hash
- `pdm checkbox toggle <item_path> <hash>` — 切换 hash 对应 checkbox 的完成状态

**实现注意**：

- toggle 时解析 markdown，修改对应的 `- [ ]` → `- [x]`（或反向），保留其余内容不变
- 多个内容相同的 checkbox → 第1个匹配的

## CLI 设计

### 全局选项

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `--dir` | `~/.project.md` | 指定根目录 |

### 命令树

```
pdm
├── init                               # 初始化根目录
├── project
│   ├── ls                             # 列出所有 project
│   ├── init <name>                    # 创建 project（含 readme.md）
│   ├── context <name>                 # 显示 project 的 readme.md
│   └── rm <name>                      # 删除 project（需确认）
├── kanban
│   ├── ls <project>                   # 列出 project 下的所有 kanban
│   └── init <project>/<kanban>        # 创建 kanban（至少一个 column）
│   └── rm <project>/<kanban>          # 删除 kanban（需确认）
├── column
│   ├── ls <project>/<kanban>          # 列出 kanban 下的所有 column
│   └── init <project>/<kanban>/<col>  # 创建 column
│   └── rm <project>/<kanban>/<col>    # 删除空 column
├── item
│   ├── ls <path>                      # 列出 items（path可为project/kanban/column级别）
│   ├── new <path>                     # 在 column 下创建 item（交互式输入 name/desc）
│   ├── show <item_path>               # 显示 item 详情（含 checkboxes）
│   ├── mv <item_path> <dest_column>   # 移动 item 到其他 column
│   └── rm <item_path>                 # 删除 item（需确认）
└── checkbox
    ├── ls <item_path>                 # 列出 item 内的 checkbox
    └── toggle <item_path> <hash>      # 切换 checkbox 状态
```

**路径快捷语法**：

- `<project>` — 仅项目名
- `<project>/<kanban>` — 项目下看板
- `<project>/<kanban>/<column>` — 看板下列
- `<project>/<kanban>/<column>/<item>` — 具体卡片

所有路径均为相对根目录的文件夹路径。

## 后续考虑（设计提及，当前不实现）

### 账户与权限

- 引入 SQLite，存储 api_key → 权限映射
- 每个 api key 可绑定到特定 project，权限级别：read / write / admin
- 操作日志（谁、什么时间、对什么做了什么）写入操作日志表

### 远程模式

- `pdm remote add <name> <url> <api_key>` — 注册远程项目
- `pdm remote ls` — 查看远程项目状态
- CLI 通过 HTTP API 与远端通信，服务端读文件系统返回结果

### 排序

- 引入 `.<scope>.ordering` 文件定义自定义排序

## 技术栈

| 层 | 技术 | 说明 |
| --- | --- | --- |
| 包管理 | pnpm | |
| 构建 | vite / tsup | CLI 用 tsup，Web 用 vite |
| 语言 | TypeScript 5.x | strict mode |
| CLI 框架 | commander 或 citty | |
| Web 框架 | React + Zustand | 极简 kanban UI |
| 测试 | vitest | BDD + TDD 流程 |
| 格式化 | ESLint + Prettier | 遵循 ts.md 规范 |
| 数据库 | SQLite + Drizzle ORM | 仅后续账户/日志需求引入 |

## 开发约束

- **TDD 优先**：按 `docs/dev/bddtdd.md` 流程，先写 BDD 注释测试，再写 RED 测试，最后实现功能
- **AI 友好**：所有功能均可通过 CLI 调用，不做仅有 UI 才能操作的功能
- **snake_case 命名**：遵循 `docs/dev/ts.md`
- **单文件修改**：尽可能只编辑最小文件集合

## 版本路线 v0.1.0（MVP）

1. 项目初始化：`init`、`project init`
2. 看板管理：`kanban`、`column` CRUD
3. 卡片管理：`item` CRUD + `item mv`
4. 待办管理：`checkbox ls`、`checkbox toggle`
5. 本地模式：仅文件夹操作，无数据库、无网络
6. CLI 工具：pdm 可执行文件

实现顺序以 CLI 功能链打通为主，UI 看板可后续迭代。