import type { Command } from "commander";
import path from "node:path";
import { column_init, column_list } from "../core/column.js";
import { split_first } from "./_helpers.js";

export function column_commands(program: Command): void {
  function root(): string {
    return (program.getOptionValue("dir") as string) || "";
  }

  const cmd = program.command("column").description("列管理");

  cmd
    .command("ls <path>")
    .description("列出看板下的列 (格式: project/kanban)")
    .action(async (path_str) => {
      const { head: project_name, tail: rest } = split_first(path_str);
      const list = await column_list(path.join(root(), project_name, rest));
      if (list.length === 0) return console.log("(empty)");
      list.forEach((n) => console.log(n));
    });

  cmd
    .command("init <path>")
    .description("创建列 (格式: project/kanban/column)")
    .action(async (path_str) => {
      const { head: project_name, tail: rest } = split_first(path_str);
      const { head: kanban_name, tail: column_name } = split_first(rest);
      const kanban_dir = path.join(root(), project_name, kanban_name);
      await column_init(kanban_dir, column_name);
      console.log("column: " + project_name + "/" + kanban_name + "/" + column_name);
    });
}