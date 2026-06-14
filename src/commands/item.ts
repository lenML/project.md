import type { Command } from "commander";
import path from "node:path";
import { item_new, item_list, item_show } from "../core/item.js";
import { item_move_with_check } from "../core/checklist.js";
import { trash_item, permanent_delete, list_trash } from "../core/trash.js";
import { resolve_item_path, prepend_bound } from "./_helpers.js";

export function item_commands(program: Command): void {
  function root(): string {
    return (program.getOptionValue("dir") as string) || "";
  }
  function force_flag(): boolean {
    return (program.getOptionValue("force") as boolean) || false;
  }

  const cmd = program.command("item").description("卡片管理");

  cmd
    .command("ls <path>")
    .description("列出卡片 (path = project/kanban/column)")
    .action(async (path_str) => {
      const list = await item_list(prepend_bound(root(), path_str, force_flag()));
      if (list.length === 0) return console.log("(empty)");
      list.forEach((i) => console.log(i.id + "  " + i.name));
    });

  cmd
    .command("new <path> <name>")
    .description("创建卡片 (path = project/kanban/column)")
    .option("-d, --desc <desc>", "描述")
    .action(async (path_str, name, options) => {
      const item = await item_new(prepend_bound(root(), path_str, force_flag()), name, options.desc);
      console.log("created: " + item.id + " " + item.file_path);
    });

  cmd
    .command("add <path> <name>")
    .description("创建卡片 (new 的别名)")
    .option("-d, --desc <desc>", "描述")
    .action(async (path_str, name, options) => {
      const item = await item_new(prepend_bound(root(), path_str, force_flag()), name, options.desc);
      console.log("created: " + item.id + " " + item.file_path);
    });

  cmd
    .command("show <item_path>")
    .description("显示卡片详情 (支持 ID 或路径)")
    .action(async (item_path_str) => {
      const resolved = await resolve_item_path(root(), item_path_str, force_flag());
      if (!resolved) return console.log("item not found (ID: " + item_path_str + ")");
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
    .command("mv <item_path> <dest_column>")
    .description("移动卡片到目标列 (hooks 验证, 支持 ID)")
    .option("--force", "跳过所有检查强制移动")
    .action(async (item_path_str, dest_str, options) => {
      const global_force = force_flag();
      const resolved = await resolve_item_path(root(), item_path_str, global_force);
      if (!resolved) { console.error("item not found (ID: " + item_path_str + ")"); process.exit(1); }
      const dest = prepend_bound(root(), dest_str, global_force);
      try {
        await item_move_with_check(resolved, dest, options.force);
        console.log("moved to: " + dest_str);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("mv 被拒绝: " + msg);
        process.exit(1);
      }
    });

  cmd
    .command("rm <item_path>")
    .description("移入回收站 (支持 ID)")
    .action(async (item_path_str) => {
      const resolved = await resolve_item_path(root(), item_path_str, force_flag());
      if (!resolved) { console.error("item not found (ID: " + item_path_str + ")"); process.exit(1); }
      const result = await trash_item(resolved);
      console.log("trashed: " + result);
    });

  const trash = cmd.command("trash").description("回收站管理");

  trash
    .command("ls <kanban_path>")
    .description("列出回收站内容 (path = project/kanban)")
    .action(async (kanban_path_str) => {
      const items = await list_trash(prepend_bound(root(), kanban_path_str, force_flag()));
      if (items.length === 0) return console.log("(empty)");
      items.forEach((p) => console.log(p));
    });

  trash
    .command("purge <item_path>")
    .description("永久删除回收站内的卡片 (支持 ID)")
    .action(async (item_path_str) => {
      const resolved = await resolve_item_path(root(), item_path_str, force_flag());
      if (!resolved) { console.error("item not found (ID: " + item_path_str + ")"); process.exit(1); }
      await permanent_delete(resolved);
      console.log("purged");
    });
}
