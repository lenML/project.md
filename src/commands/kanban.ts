import type { Command } from "commander";
import path from "node:path";
import { kanban_init, kanban_list, kanban_remove } from "../core/kanban.js";
import { column_list } from "../core/column.js";
import { item_list } from "../core/item.js";
import { split_first } from "./_helpers.js";

export function kanban_commands(program: Command): void {
  function root(): string {
    return (program.getOptionValue("dir") as string) || "";
  }

  const cmd = program.command("kanban").description("看板管理");

  cmd
    .command("ls <project>")
    .description("列出项目下的看板")
    .action(async (project_name) => {
      const list = await kanban_list(path.join(root(), project_name));
      if (list.length === 0) return console.log("(empty)");
      list.forEach((n) => console.log(n));
    });

  cmd
    .command("init <path>")
    .description("创建看板 (格式: project/kanban)")
    .option("--bp", "使用最佳实践模板（创建 idea/todo/doing/done 列 + hooks）")
    .action(async (path_str, options) => {
      const { head: project_name, tail: rest } = split_first(path_str);
      await kanban_init(path.join(root(), project_name), rest, options.bp ? "bp" : undefined);
      if (options.bp) {
        console.log("kanban (bp): " + rest + " in " + project_name);
      } else {
        console.log("kanban: " + rest + " in " + project_name);
      }
    });

  cmd
    .command("show <path>")
    .description("看板概览 (格式: project/kanban) — 列出所有列及卡片")
    .action(async (path_str) => {
      const kanban_dir = path.join(root(), path_str);
      const cols = await column_list(kanban_dir);
      if (cols.length === 0) return console.log("(empty kanban)");
      for (const col of cols) {
        const items = await item_list(path.join(kanban_dir, col));
        const cards = items.map((i) => "  " + i.id + "  " + i.name).join("\n");
        console.log(col + " (" + items.length + "):");
        if (items.length > 0) console.log(cards);
        console.log("");
      }
      console.log("提示: 使用 pdm checkbox --help 管理子任务");
    });

  cmd
    .command("cols <path>")
    .description("列出看板下的列 (格式: project/kanban)")
    .action(async (path_str) => {
      const cols = await column_list(path.join(root(), path_str));
      if (cols.length === 0) return console.log("(empty)");
      cols.forEach((n) => console.log(n));
    });

  cmd
    .command("rm <path>")
    .description("删除看板 (格式: project/kanban)")
    .action(async (path_str) => {
      const { head: project_name, tail: rest } = split_first(path_str);
      await kanban_remove(path.join(root(), project_name), rest);
      console.log("removed: " + project_name + "/" + rest);
    });
}
