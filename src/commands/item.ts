import type { Command } from "commander";
import path from "node:path";
import { item_new, item_list, item_show } from "../core/item.js";
import { item_move_with_check } from "../core/checklist.js";
import { trash_item, permanent_delete, list_trash } from "../core/trash.js";

export function item_commands(program: Command): void {
  function root(): string {
    return (program.getOptionValue("dir") as string) || "";
  }

  const cmd = program.command("item").description("卡片管理");

  cmd
    .command("ls <path>")
    .description("列出卡片 (path = project/kanban/column)")
    .action(async (path_str) => {
      const list = await item_list(path.join(root(), path_str));
      if (list.length === 0) return console.log("(empty)");
      list.forEach((i) => console.log(i.id + "  " + i.name));
    });

  cmd
    .command("new <path> <name>")
    .description("创建卡片 (path = project/kanban/column)")
    .option("-d, --desc <desc>", "描述")
    .action(async (path_str, name, options) => {
      const item = await item_new(path.join(root(), path_str), name, options.desc);
      console.log("created: " + item.id + " " + item.file_path);
    });

  cmd
    .command("add <path> <name>")
    .description("创建卡片 (new 的别名)")
    .option("-d, --desc <desc>", "描述")
    .action(async (path_str, name, options) => {
      const item = await item_new(path.join(root(), path_str), name, options.desc);
      console.log("created: " + item.id + " " + item.file_path);
    });

  cmd
    .command("show <item_path>")
    .description("显示卡片详情")
    .action(async (item_path_str) => {
      const detail = await item_show(path.join(root(), item_path_str));
      if (detail === null) return console.log("item not found");
      const rootDir = root();
      const relPath = path.relative(rootDir, path.join(rootDir, item_path_str));
      console.log("name: " + (detail.metadata.name || "(untitled)"));
      if (detail.metadata.desc) console.log("desc: " + detail.metadata.desc);
      console.log("path: " + relPath);
      console.log("---");
      if (detail.checkboxes.length > 0) {
        detail.checkboxes.forEach((t) => {
          const mark = t.checked ? "[x]" : "[ ]";
          console.log("  " + mark + " " + t.text + "  #" + t.hash);
        });
      }
      if (detail.body.trim()) {
        console.log("---");
        console.log(detail.body.trim());
      }
    });

  cmd
    .command("mv <item_path> <dest_column>")
    .description("移动卡片到目标列 (hooks 验证)")
    .option("--force", "跳过所有检查强制移动")
    .action(async (item_path_str, dest_str, options) => {
      const src = path.join(root(), item_path_str);
      const dest = path.join(root(), dest_str);
      try {
        await item_move_with_check(src, dest, options.force);
        console.log("moved to: " + dest_str);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("mv 被拒绝: " + msg);
        process.exit(1);
      }
    });

  cmd
    .command("rm <item_path>")
    .description("移入回收站")
    .action(async (item_path_str) => {
      const result = await trash_item(path.join(root(), item_path_str));
      console.log("trashed: " + result);
    });

  const trash = cmd.command("trash").description("回收站管理");

  trash
    .command("ls <kanban_path>")
    .description("列出回收站内容 (path = project/kanban)")
    .action(async (kanban_path_str) => {
      const items = await list_trash(path.join(root(), kanban_path_str));
      if (items.length === 0) return console.log("(empty)");
      items.forEach((p) => console.log(p));
    });

  trash
    .command("purge <item_path>")
    .description("永久删除回收站内的卡片")
    .action(async (item_path_str) => {
      await permanent_delete(path.join(root(), item_path_str));
      console.log("purged");
    });
}