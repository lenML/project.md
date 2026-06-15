# Hooks 系统 API 文档

## 概述

Hooks 是 kanban 级别的拦截器，在特定操作前后注入自定义逻辑。
每个 kanban 的 .hooks/index.mjs 导出 hook 函数。

## Hook 类型

| Hook | 类型 | 参数 ctx | 返回值 |
| --- | --- | --- | --- |
| before_item_move | before | item_path, dest_column | { ok, message } |
| after_item_move | after | item_path, dest_column | void |
| before_item_create | before | item_path, item_name | { ok, message } |
| after_item_create | after | item_path, item_name | void |
| before_item_delete | before | item_path | { ok, message } |
| after_item_delete | after | item_path | void |
| before_checkbox_toggle | before | item_path | { ok, message } |
| after_checkbox_toggle | after | item_path | void |

## before 钩子

返回 { ok: true } 放行，{ ok: false, message } 阻止。

示例 — done 列校验所有 checkbox 已勾选：

`js
import { readFileSync } from "node:fs";

export function before_item_move(ctx) {
  if (ctx.dest_column === "done") {
    const content = readFileSync(ctx.item_path, "utf-8");
    const unchecked = content.match(/^- \[ \]/gm);
    if (unchecked && unchecked.length > 0) {
      return { ok: false, message: unchecked.length + " checkbox 未完成" };
    }
  }
  return { ok: true };
}
`

## after 钩子

不返回值，仅做通知/日志。支持 async。

`js
export async function after_item_create(ctx) {
  console.log("created:", ctx.item_name);
}
`

## 默认模板

pmd kanban init <name> --bp 创建最佳实践模板，包含:
- idea/todo/doing/done 四列，每列有 readme.md 说明
- .hooks/index.mjs — done 列自动校验 checkbox
- .trash 回收站目录

## ctx 字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| root_dir | string | --dir 根目录 |
| project_name | string | 项目名 |
| kanban_name | string | 看板名 |
| item_path | string | 卡片文件绝对路径 |
| item_name | string | 卡片名称 |
| dest_column | string | 目标列名（仅 move 钩子） |