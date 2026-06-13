import type { Command } from "commander";
import path from "node:path";
import { checkbox_list, checkbox_toggle } from "../core/checkbox.js";

export function checkbox_commands(program: Command): void {
  function root(): string {
    return (program.getOptionValue("dir") as string) || "";
  }

  const cmd = program.command("checkbox").description("checkbox 管理");

  cmd
    .command("ls <item_path>")
    .description("列出卡片内的 checkbox")
    .action(async (item_path_str) => {
      const items = await checkbox_list(path.join(root(), item_path_str));
      if (items.length === 0) return console.log("(empty)");
      items.forEach((t) => {
        const mark = t.checked ? "[x]" : "[ ]";
        const indent = "  ".repeat(t.depth);
        console.log(indent + mark + " " + t.text + "  #" + t.hash);
      });
    });

  cmd
    .command("toggle <item_path> <hash...>")
    .description("切换 checkbox 完成状态（支持多 hash: toggle path hash1 hash2 hash3）")
    .action(async (item_path_str, hashes) => {
      await checkbox_toggle(path.join(root(), item_path_str), ...hashes);
      console.log("toggled");
    });
}