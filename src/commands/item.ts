import type { Command } from "commander";
import path from "node:path";
import { item_new, item_list, item_show, item_import } from "../core/item.js";
import { item_move_with_check } from "../core/checklist.js";
import { trash_item, permanent_delete, list_trash } from "../core/trash.js";
import { require_column_dir, require_kanban_dir, resolve_item } from "./_helpers.js";

export function item_commands(program: Command): void {
  function root(): string {
    return (program.getOptionValue("dir") as string) || "";
  }

  const cmd = program.command("item").description("卡片管理");

  cmd
    .command("ls")
    .description("列出卡片（使用 -p/--project -k/--kanban -c/--col）")
    .action(async () => {
      const dir = require_column_dir(root(), program);
      const list = await item_list(dir);
      if (list.length === 0) return console.log("(empty)");
      list.forEach((i) => console.log(i.id + "  " + i.name));
    });

  cmd
    .command("new <name>")
    .description("创建卡片（使用 -p/--project -k/--kanban -c/--col）")
    .option("-d, --desc <desc>", "描述")
    .action(async (name, options) => {
      const dir = require_column_dir(root(), program);
      const item = await item_new(dir, name, options.desc);
      console.log("created: " + item.id + " " + item.file_path);
    });

  cmd
    .command("add <name>")
    .description("创建卡片 (new 的别名)")
    .option("-d, --desc <desc>", "描述")
    .action(async (name, options) => {
      const dir = require_column_dir(root(), program);
      const item = await item_new(dir, name, options.desc);
      console.log("created: " + item.id + " " + item.file_path);
    });

  cmd
    .command("import <file>")
    .description("从 markdown 文件导入卡片（使用 -p -k -c 指定目标列）")
    .action(async (file) => {
      const dir = require_column_dir(root(), program);
      const resolved_path = path.resolve(file);
      const item = await item_import(dir, resolved_path);
      console.log("imported: " + item.id + " " + item.file_path);
    });

  cmd
    .command("show <item>")
    .description("显示卡片详情（支持 8 位 hex ID）")
    .action(async (item_arg) => {
      const resolved = await resolve_item(root(), item_arg);
      if (!resolved) return console.log("item not found: " + item_arg);
      const detail = await item_show(resolved);
      if (detail === null) return console.log("item not found");
      const relPath = path.relative(root(), resolved);
      console.log("name: " + (detail.metadata.name || "(untitled)"));
      if (detail.metadata.desc) console.log("desc: " + detail.metadata.desc);
      console.log("path: " + relPath);
      console.log("---");
      if (detail.checkboxes.length > 0) {
        detail.checkboxes.forEach((t) => {
          const mark = t.checked ? "[x]" : "[ ]";
          const indent = "  ".repeat(t.depth);
          console.log(indent + mark + " " + t.text + "  #" + t.hash);
        });
      }
      if (detail.body.trim()) {
        console.log("---");
        console.log(detail.body.trim());
      }
    });

  cmd
    .command("mv <item>")
    .description("移动卡片到目标列（使用 -c/--col 指定目标列，-k/--kanban 指定目标看板）")
    .option("--force", "跳过 hooks 检查强制移动")
    .action(async (item_arg, options) => {
      const resolved = await resolve_item(root(), item_arg);
      if (!resolved) { console.error("item not found: " + item_arg); process.exit(1); }
      // 目标列：使用 --project/--kanban/--col，其中 --project 默认来源
      const dest = require_column_dir(root(), program);
      try {
        await item_move_with_check(resolved, dest, options.force);
        console.log("moved");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("mv 被拒绝: " + msg);
        process.exit(1);
      }
    });

  cmd
    .command("rm <item>")
    .description("移入回收站（支持 8 位 hex ID）")
    .action(async (item_arg) => {
      const resolved = await resolve_item(root(), item_arg);
      if (!resolved) { console.error("item not found: " + item_arg); process.exit(1); }
      const result = await trash_item(resolved);
      console.log("trashed: " + result);
    });

  const trash = cmd.command("trash").description("回收站管理");

  trash
    .command("ls")
    .description("列出回收站内容（使用 -p/--project -k/--kanban）")
    .action(async () => {
      const kanban_dir = require_kanban_dir(root(), program);
      const items = await list_trash(kanban_dir);
      if (items.length === 0) return console.log("(empty)");
      items.forEach((p) => console.log(p));
    });

  trash
    .command("purge <item>")
    .description("永久删除回收站内的卡片（支持 8 位 hex ID）")
    .action(async (item_arg) => {
      const resolved = await resolve_item(root(), item_arg);
      if (!resolved) { console.error("item not found: " + item_arg); process.exit(1); }
      await permanent_delete(resolved);
      console.log("purged");
    });
}
