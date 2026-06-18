import type { Command } from "commander";
import { column_init, column_list, column_read_readme, column_set_order } from "../core/column.js";
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

  cmd
    .command("readme <name>")
    .description("查看列 readme（使用 -p/--project -k/--kanban）")
    .action(async (col_name) => {
      const dir = require_kanban_dir(root(), program);
      const content = await column_read_readme(dir, col_name);
      if (content === null) return console.log("(no readme)");
      console.log(content);
    });

  cmd
    .command("order <name>")
    .description("设置列排序位置（使用 -p/--project -k/--kanban，0 排最前）")
    .argument("<position>", "排序位置，留空则清除")
    .action(async (col_name, position) => {
      const kanban_dir = require_kanban_dir(root(), program);
      const pos = position !== undefined ? parseInt(position, 10) : undefined;
      await column_set_order(kanban_dir, col_name, pos);
      console.log("order set: " + col_name + " = " + pos);
    });
}
