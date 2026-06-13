import type { Command } from "commander";
import path from "node:path";
import { item_new, item_list, item_show, item_move, item_remove } from "../core/item.js";

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
    .command("show <item_path>")
    .description("显示卡片详情")
    .action(async (item_path_str) => {
      const detail = await item_show(path.join(root(), item_path_str));
      if (detail === null) return console.log("item not found");
      console.log("name: " + (detail.metadata.name || "(untitled)"));
      if (detail.metadata.desc) console.log("desc: " + detail.metadata.desc);
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
    .description("移动卡片到目标列")
    .action(async (item_path_str, dest_str) => {
      const src = path.join(root(), item_path_str);
      const dest = path.join(root(), dest_str);
      await item_move(src, dest);
      console.log("moved to: " + dest_str);
    });

  cmd
    .command("rm <item_path>")
    .description("删除卡片")
    .action(async (item_path_str) => {
      await item_remove(path.join(root(), item_path_str));
      console.log("removed");
    });
}