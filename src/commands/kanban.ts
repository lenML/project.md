import type { Command } from "commander";
import path from "node:path";
import { kanban_init, kanban_list, kanban_remove } from "../core/kanban.js";
import { column_list } from "../core/column.js";
import { item_list } from "../core/item.js";
import { require_project_dir, require_kanban_dir } from "./_helpers.js";

export function kanban_commands(program: Command): void {
  function root(): string {
    return (program.getOptionValue("dir") as string) || "";
  }

  const cmd = program.command("kanban").description("看板管理");

  cmd
    .command("ls")
    .description("列出项目下的看板（使用 -p/--project）")
    .action(async () => {
      const dir = require_project_dir(root(), program);
      const list = await kanban_list(dir);
      if (list.length === 0) return console.log("(empty)");
      list.forEach((n) => console.log(n));
    });

  cmd
    .command("init <name>")
    .description("创建看板")
    .option("--bp", "使用最佳实践模板（idea/todo/doing/done 列 + hooks）")
    .action(async (kanban_name, options) => {
      const project_dir = require_project_dir(root(), program);
      await kanban_init(project_dir, kanban_name, options.bp ? "bp" : undefined);
      console.log("kanban: " + kanban_name + (options.bp ? " (bp)" : ""));
    });

  cmd
    .command("show")
    .description("看板概览（使用 -p/--project -k/--kanban）")
    .action(async () => {
      const kanban_dir = require_kanban_dir(root(), program);
      const cols = await column_list(kanban_dir);
      if (cols.length === 0) return console.log("(empty kanban)");
      for (const col of cols) {
        const items = await item_list(path.join(kanban_dir, col));
        const cards = items.map((i) => "  " + i.id + "  " + i.name).join("\n");
        console.log(col + " (" + items.length + "):");
        if (items.length > 0) console.log(cards);
        console.log("");
      }
      console.log("提示: 使用 pmd checkbox --help 管理子任务");
    });

  cmd
    .command("cols")
    .description("列出看板下的列（使用 -p/--project -k/--kanban）")
    .action(async () => {
      const kanban_dir = require_kanban_dir(root(), program);
      const list = await column_list(kanban_dir);
      if (list.length === 0) return console.log("(empty)");
      list.forEach((n) => console.log(n));
    });

  cmd
    .command("rm <name>")
    .description("删除看板")
    .action(async (kanban_name) => {
      const project_dir = require_project_dir(root(), program);
      await kanban_remove(project_dir, kanban_name);
      console.log("removed: " + kanban_name);
    });
}

/**
 * 用于 kanban list 的无参模式（绑定后显示所有看板）。
 * 在 require_kanban_dir 失败时 fallback。
 */
export async function kanban_show_all(program: Command): Promise<void> {
  const { get_project_name } = await import("./_helpers.js");
  const dir_root = (program.getOptionValue("dir") as string) || "";
  const name = get_project_name(program);
  if (!name) {
    console.error("need --project <name> or project bind");
    process.exit(1);
  }
  const project_dir = path.join(dir_root, name);
  console.log(`[proj: ${name}] project overview`);
  const kanbans = await kanban_list(project_dir);
  if (kanbans.length === 0) return void console.log("(empty)");
  for (const kb of kanbans) {
    console.log("── " + kb + " ──");
    const cols = await column_list(path.join(project_dir, kb));
    for (const col of cols) {
      const items = await item_list(path.join(project_dir, kb, col));
      const cards = items.map((i) => "  " + i.id + "  " + i.name).join("\n");
      console.log(col + " (" + items.length + "):");
      if (items.length > 0) console.log(cards);
    }
    console.log("");
  }
  console.log("提示: 使用 pmd checkbox --help 管理子任务");
}
