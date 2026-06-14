import type { Command } from "commander";
import { checkbox_list, checkbox_toggle } from "../core/checkbox.js";
import { resolve_item_path } from "./_helpers.js";

export function checkbox_commands(program: Command): void {
  function root(): string {
    return (program.getOptionValue("dir") as string) || "";
  }

  const cmd = program.command("checkbox").description("checkbox 管理");

  cmd
    .command("ls <item_path>")
    .description("列出卡片内的 checkbox (支持 ID)")
    .action(async (item_path_str) => {
      const resolved = await resolve_item_path(root(), item_path_str);
      if (!resolved) return console.log("item not found (ID: " + item_path_str + ")");
      const items = await checkbox_list(resolved);
      if (items.length === 0) return console.log("(empty)");
      items.forEach((t) => {
        const mark = t.checked ? "[x]" : "[ ]";
        const indent = "  ".repeat(t.depth);
        console.log(indent + mark + " " + t.text + "  #" + t.hash);
      });
    });

  cmd
    .command("toggle <item_path> <hash...>")
    .description("切换 checkbox 完成状态（支持多 hash，支持 ID）")
    .action(async (item_path_str, hashes) => {
      const resolved = await resolve_item_path(root(), item_path_str);
      if (!resolved) { console.error("item not found (ID: " + item_path_str + ")"); process.exit(1); }
      await checkbox_toggle(resolved, ...hashes);
      console.log("toggled");
    });
}
