# Web 前端设计文档

## 概述

纯前端 React 应用，无后端服务器。通过浏览器 File System Access API 直接操作本地文件系统。
与 CLI 共享同一文件格式，events 用 `events.web.jsonl` 避免锁冲突。

## 技术栈

| 技术 | 用途 |
| --- | --- |
| React 19 | 组件框架 |
| Zustand 5 | 状态管理 |
| Vite 6 | 构建工具 |
| TailwindCSS 4 | 样式 |
| Lucide React | 图标库 |
| File System Access API | 文件读写 |
| unified/remark-parse/remark-gfm | Markdown AST 解析 |
| js-yaml | YAML frontmatter 解析 |

## 架构

### 组件树

```
App
├── DirPicker              # 首次目录选择
├── Header                 # 刷新/GitHub/编辑模式切换
├── Sidebar                # 项目/看板导航
├── Main
│   ├── KanbanBoard        # 看板块（搜索 + 列视图）
│   │   └── ColumnView     # 单列（卡片列表）
│   │       ├── CardItem   # 卡片卡片（带遮罩 loading）
│   │       ├── CheckboxBadges
│   │       ├── ColReadme  # 列说明（可编辑）
│   │       └── NewCardForm
│   └── ProjectReadme      # 项目说明
├── EventLog               # 可收起日志面板
└── CardDetail             # 卡片详情弹窗（分栏/缩进）
    ├── CheckboxRow        # checkbox 行（层级缩进）
    ├── CardEventRow       # 相关操作时间线
    └── CardDetailEditor   # 编辑表单
```

### 状态层（Zustand Store）

```
useStore
├── rootHandle          # FileSystemDirectoryHandle
├── projects            # ProjectData[] — 全部项目数据
├── events              # EventRecord[]
├── view                # { project, kanban, card, logOpen }
├── loading             # 数据加载中
├── saving              # 写操作进行中（按钮 disabled + 遮罩）
├── writeMode           # 编辑模式开关
├── searchQuery         # 搜索过滤
├── eventFilter         # 日志过滤
└── ...操作方法
```

### Hooks

| Hook | 用途 |
| --- | --- |
| `useKanban` | 看板数据、列排序、搜索过滤、拖放 |
| `useCardDetail` | 卡片详情、编辑/删除、相关事件 |
| `useColumnLogic` | 分页加载、readme 编辑 |
| `usePolling` | 3s 轮询刷新数据 |

### 关键设计决策

#### 读写分离
- 所有写操作（create/update/delete/move/toggle）在 store 中设置 `saving: true`
- 操作完成后统一 `loadAll()` 刷新全部数据
- `saving` 期间按钮 disabled、卡片显示遮罩、拖拽禁用

#### 文件系统操作
- `loadAll()` 遍历 `rootHandle` 递归读取全部项目和看板
- `tryGetDir` / `tryGetFile` 安全获取句柄（不抛异常）
- `readTextFile` / `writeTextFile` / `createFile` / `removeEntry` 封装 File System Access API

#### 编辑模式
- 切换 `writeMode` 解锁编辑/删除/拖拽/新建功能
- 编辑未保存时关闭弹窗弹出确认
- 删除操作弹窗确认后执行

#### 事件日志
- Web 端写入 `events.web.jsonl`，格式同 CLI 的 `events.jsonl`
- 在 UI 中可收起展开，支持过滤和分页

## 构建与部署

```bash
cd web
pnpm dev          # 开发服务器 localhost:5173
pnpm build        # tsc + vite build → web/dist/
pnpm lint         # eslint
```

GitHub Actions 构建后部署到 GitHub Pages。

## 与 CLI 对比

| 能力 | CLI | Web |
| --- | --- | --- |
| 查看看板 | pmd kanban show | KanbanBoard + Sidebar |
| 创建卡片 | pmd item new | NewCardForm (编辑模式) |
| 编辑卡片 | pmd item import + 编辑文件 | CardDetailEditor |
| 移动卡片 | pmd item mv | 拖拽 (DnD) |
| 删除卡片 | pmd item rm | 按钮移入回收站 |
| 回收站 | pmd item trash | TrashPanel |
| 日志 | pmd event ls | EventLog (可收起) |
| 远程模式 | CLI 扩展 | 不支持 |
| 文件操作 | 直接写文件系统 | File System Access API |
