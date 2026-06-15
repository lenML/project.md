# project.md — 产品设计文档

版本: 0.1.0 | 状态: draft

## 产品愿景

基于 markdown 文件的项目管理工具。文件夹即看板，markdown 即卡片，全文可迁移、可手动编辑、可版本控制。

## 核心概念

| 概念 | 映射 | 说明 |
| --- | --- | --- |
| Root | ~/.project.md/ | 默认根目录，--dir 或 PMD_DIR 可覆盖 |
| Project | <root>/<project>/ | 一个项目，包含一个或多个 kanban |
| Kanban | <project>/<kanban>/ | 一个看板，包含多个 column |
| Column | <kanban>/<column>/ | 一个状态列，包含多个 item |
| Item | <column>/<file>.md | YAML frontmatter + markdown 正文 |
| Checkbox | 卡片中的 - [ ] 行 | 子任务，通过 hash 标识，支持多级嵌套 |
| Event Log | <project>/events.jsonl | append-only 操作记录 |
| Hooks | <kanban>/.hooks/index.mjs | 自定义拦截器（before/after 事件） |
| Trash | <kanban>/.trash/ | 回收站，二次删除才永久删除 |
| Context | <project>/readme.md | 项目上下文，所有 kanban 共享 |

## 目录结构

`
~/.project.md/
├── my-project/
│   ├── readme.md                         # project context / config
│   ├── events.jsonl                      # CLI 操作记录
│   ├── dev/                              # kanban: dev
│   │   ├── .hooks/index.mjs              # 钩子
│   │   ├── .trash/                       # 回收站
│   │   ├── todo/
│   │   │   ├── readme.md                 # 列说明
│   │   │   └── 实现登录模块.md             # item
│   │   ├── doing/
│   │   │   └── ...
│   │   ├── done/
│   │   └── idea/
│   └── bugs/
│       └── ...
`

## 文件格式

Item 卡片用 YAML frontmatter 分隔元数据：

`markdown
---
id: 8f3a2b1c                # short_hash(name + created_at)[:8]
name: 实现登录模块
desc: 用户登录功能
created_at: 2024-01-01T10:00:00+08:00
---
正文 markdown...

- [ ] 子任务             # hash: sha256(text.trim())[:8]
  - [x] 嵌套子任务       # 多级缩进
`

项目 eadme.md 也可含 YAML frontmatter，元数据作为项目配置。

## CLI 定位

用标志位：-p project -k kanban -c col。卡片支持 8 位 hex ID 全局寻址。
.pmdrc 配置（向上遍历）提供 project/kanban/col 默认值。

`
pmd {init,project,kanban,column,item,checkbox,event}
  project {ls,init,bind,unbind,config,context}
  kanban  {ls,init,show,cols,rm}       # init --bp 最佳实践
  item    {ls,new,show,mv,rm,import}   # rm -> .trash 回收站
  checkbox {ls,toggle}                  # toggle 多 hash + 父子联动
  event   ls                            # --limit/--type/--offset
`

## .pmdrc 配置

`ini
project = my-project
kanban = dev
col = todo
`

向上目录遍历，子目录自动继承父级配置。

## Hooks 系统

每个 kanban 的 .hooks/index.mjs 可导出 before/after 钩子：
- efore_item_move / fter_item_move
- efore_item_create / fter_item_create
- efore_item_delete / fter_item_delete
- efore_checkbox_toggle / fter_checkbox_toggle

before 钩子返回 { ok: true } 或 { ok: false, message } 阻止操作。

## Web 前端

React + Zustand + File System Access API。纯前端无后端。
只读/编辑模式切换，拖拉拽移动卡片，可收起事件日志。
事件写入 vents.web.jsonl 避免与 CLI 锁冲突。

## 后续考虑

账户权限（SQLite + API key）、远程模式（HTTP API）、自定义排序。

## 技术栈

pnpm / TypeScript strict / commander / tsup (CLI) / vite + React + Zustand (Web) / vitest

## 开发约束

snake_case 命名（变量/函数/文件名），PascalCase 类型。ESM only。TDD 优先。CLI first。
