# agents.md

项目级指引，供 AI agent 使用。详细设计见对应文档。

## Design Docs

- [产品设计](docs/product_design.md) — 核心概念、CLI 命令树、文件格式
- [TypeScript 规范](docs/dev/ts.md) — `snake_case` 命名、strict 模式
- [BDD/TDD 流程](docs/dev/bddtdd.md) — 先写 BDD 注释，再写 RED 测试

## Key Requirements

1. **snake_case** — 所有变量、函数、文件名用 `snake_case`。类型用 `PascalCase`
2. **no apply_patch** — 不要使用 `apply_patch` 进行复杂编辑，使用 `apply-edits` 替代
3. **TDD first** — 按 `docs/dev/bddtdd.md` 流程，先写 BDD 注释测试，再写 RED 测试，最后实现
4. **minimal edits** — 尽可能只修改最小文件集合，不重构未涉及代码
5. **ESM only** — `"type": "module"`，import 带 `.js` 后缀
6. **no console left in src** — 调试用 `console.log` 在提交前清理（CLI 命令中的 `console.log` 除外）
7. **kanban = folder** — 看板即文件夹，item 即 `.md` 文件，不依赖数据库
8. **CLI first** — 所有功能优先 CLI 实现，Web 前端是只读查看器

## Test Environment

`./temp/` 保留为本地测试环境，包含：

```
temp/.projects/       # pmd 根目录（--dir 指向此处）
temp/todomvc/         # TodoMVC 测试项目
```

测试时使用：
```bash
pmd --dir ./temp/.projects <command>
```

## Global Install

```bash
pmd --version         # 全局可用（npm link）
```

## Project Binding

当前目录可通过 `pmd project bind <name>` 绑定到项目。绑定后所有路径自动带项目前缀，且阻止使用其他项目（通过 `--force` 覆盖）。

```bash
cd /my/workspace
pmd project bind my-app
pmd kanban show              # 显示所有看板概览
pmd kanban show dev/todo     # = my-app/dev/todo
pmd --force kanban show other-proj/xxx  # 覆盖绑定
```

## Web Frontend

`web/` 目录单独构建，与 CLI 独立。使用浏览器 File System Access API。

```bash
cd web && pnpm dev   # localhost:5173
```

## Build & Test

```bash
pnpm build    # tsup → dist/
pnpm test     # vitest run
pnpm lint     # eslint src/
```

## Naming Conventions

- Files: `snake_case.ts`
- Functions: `snake_case`
- Types: `PascalCase`
- Variables: `snake_case`
- Constants: `snake_case` / `UPPER_CASE`
- Event types: `snake_case` string literals

## Path Convention

所有 CLI 路径使用标志定位：`-p <project> -k <kanban> -c <col>`，相对于 `--dir` 指定的根目录。
绝对路径也支持（用于 `checkbox toggle`、`item show` 等）。
