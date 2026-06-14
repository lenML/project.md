import type { Command } from "commander";
import path from "node:path";
import { column_init, column_list } from "../core/column.js";
import { prepend_bound } from "./_helpers.js";

export function column_commands(program: Command): void {
  function root(): string {
    return (program.getOptionValue("dir") as string) || "";
  }
  function force_flag(): boolean {
    return (program.getOptionValue("force") as boolean) || false;
  }

  const cmd = program.command("column").description("列管理");

  cmd
    .command("ls <path>")
    .description("列出看板下的列 (支持绑定)")
    .action(async (path_str) => {
      const dir = prepend_bound(root(), path_str, force_flag());
      const list = await column_list(dir);
      if (list.length === 0) return console.log("(empty)");
      list.forEach((n) => console.log(n));
    });

  cmd
    .command("init <path>")
    .description("创建列 (支持绑定)")
    .action(async (path_str) => {
      const dir = prepend_bound(root(), path_str, force_flag());
      const col_name = path.basename(dir);
      const kanban_dir = path.dirname(dir);
      await column_init(kanban_dir, col_name);
      console.log("column: " + col_name + " in " + kanban_dir);
    });
}
