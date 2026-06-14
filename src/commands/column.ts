import type { Command } from "commander";
import { column_init, column_list } from "../core/column.js";
import { require_kanban_dir } from "./_helpers.js";

export function column_commands(program: Command): void {
  function root(): string {
    return (program.getOptionValue("dir") as string) || "";
  }

  const cmd = program.command("column").description("列管理");

  cmd
    .command("ls")
    .description("列出看板下的列（使用 -p/--project -k/--kanban）")
    .action(async () => {
      const dir = require_kanban_dir(root(), program);
      const list = await column_list(dir);
      if (list.length === 0) return console.log("(empty)");
      list.forEach((n) => console.log(n));
    });

  cmd
    .command("init <name>")
    .description("创建列（使用 -p/--project -k/--kanban）")
    .action(async (col_name) => {
      const kanban_dir = require_kanban_dir(root(), program);
      await column_init(kanban_dir, col_name);
      console.log("column: " + col_name);
    });
}
