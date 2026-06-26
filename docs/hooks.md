# Hooks 系统 API 文档

## 概述

Hooks 是 kanban 级别的拦截器，在特定操作前后注入自定义逻辑。
每个 kanban 的 `.hooks/index.mjs` 导出 hook 函数。

## Hook 类型

| Hook | 类型 | 参数 ctx | 返回值 |
| --- | --- | --- | --- |
| `before_item_move` | before | item_path, source_column, dest_column | `{ ok, message }` |
| `after_item_move` | after | item_path, source_column, dest_column | void |
| `before_item_create` | before | item_path, project_name, kanban_name | `{ ok, message }` |
| `after_item_create` | after | item_path, project_name, kanban_name | void |
| `before_item_delete` | before | item_path | `{ ok, message }` |
| `after_item_delete` | after | item_path | void |
| `before_checkbox_toggle` | before | item_path | `{ ok, message }` |
| `after_checkbox_toggle` | after | item_path | void |

## before 钩子

返回 `{ ok: true }` 放行，`{ ok: false, message }` 阻止操作。

## after 钩子

不返回值，仅做通知/日志。支持 async。

## ctx 字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `root_dir` | string | `--dir` 根目录 |
| `project_name` | string | 项目名 |
| `kanban_name` | string | 看板名 |
| `item_path` | string | 卡片文件绝对路径 |
| `item_name` | string | 卡片名称 |
| `source_column` | string | 源列名（仅 move 钩子） |
| `dest_column` | string | 目标列名（仅 move 钩子） |

## 最佳实践模板

`pmd kanban init <name> --bp` 创建最佳实践模板，内置 `best_practice_hooks.mjs`：

### 移动规则

```
idea → backlog, todo, doing
backlog → idea, todo, doing
todo → idea, backlog, doing
doing → idea, backlog, todo, done
done → （不可移出）
```

- 主流程：idea→backlog→todo→doing→done
- 允许后移（如 doing→todo 细化细节）
- done 是终点，不可移出

### 校验规则

1. **todo / doing / done 列**：卡片必须有 checkbox 子任务。无 checkbox 的卡片阻止移入。
2. **done 列**：所有 checkbox 必须勾选完成。未完成的阻止移入。

### 默认列

| 列 | 说明 |
| --- | --- |
| `idea` | 想法/点子，不要求执行 |
| `backlog` | 待细化，需要添加 checkbox 后移入 todo |
| `todo` | 待办，已拆分到可执行的粒度 |
| `doing` | 进行中，同一时间不要太多 |
| `done` | 完成，自动校验 checkbox 完整性 |

### 自建钩子示例

```js
import { readFileSync } from "node:fs";

export function before_item_move(ctx) {
  // done 列校验所有 checkbox 已完成
  if (ctx.dest_column === "done") {
    const content = readFileSync(ctx.item_path, "utf-8");
    const unchecked = content.match(/^- \[ \]/gm);
    if (unchecked && unchecked.length > 0) {
      return { ok: false, message: unchecked.length + " checkbox 未完成: " + unchecked.join(", ") };
    }
  }
  return { ok: true };
}

export async function after_item_create(ctx) {
  console.log("created:", ctx.item_name);
}
```

注意：`best_practice_hooks.mjs` 位于 `src/core/`，构建时拷贝到 `dist/`。
