import type { Command } from "commander";
import path from "node:path";
import { kanban_init, kanban_list, kanban_remove } from "../core/kanban.js";
import { column_list } from "../core/column.js";
import { item_list } from "../core/item.js";
import { split_first, prepend_bound } from "./_helpers.js";

export function kanban_commands(program: Command): void {
  function root(): string {
    return (program.getOptionValue("dir") as string) || "";
  }

  const cmd = program.command("kanban").description("看板管理");

  function force_flag(): boolean {
    return (program.getOptionValue("force") as boolean) || false;
  }

  cmd
    .command("ls [project]")
    .description("列出项目下的看板（绑定后可省略 project）")
    .action(async (project_name) => {
      const { get_bound_project } = await import("./_helpers.js");
      const dir = root();
      let target_dir: string;
      if (!project_name) {
        project_name = get_bound_project();
        if (!project_name) {
          console.error("need project name or binding");
          process.exit(1);
        }
        target_dir = path.join(dir, project_name);
        console.log(`[proj: ${project_name}] (bound)`);
      } else {
        target_dir = prepend_bound(dir, project_name, force_flag());
      }
      const list = await kanban_list(target_dir);
      if (list.length === 0) return console.log("(empty)");
      list.forEach((n) => console.log(n));
    });

  cmd
    .command("init <path>")
    .description("创建看板 (格式: project/kanban)")
    .option("--bp", "使用最佳实践模板（创建 idea/todo/doing/done 列 + hooks）")
    .action(async (path_str, options) => {
      const { head: project_name, tail: rest } = split_first(path_str);
      await kanban_init(prepend_bound(root(), project_name, force_flag()), rest, options.bp ? "bp" : undefined);
      if (options.bp) {
        console.log("kanban (bp): " + rest + " in " + project_name);
      } else {
        console.log("kanban: " + rest + " in " + project_name);
      }
    });

  cmd
    .command("show [path]")
    .description("看板概览 (格式: project/kanban, 绑定后可省略 path)")
    .action(async (path_str) => {
      const { get_bound_project } = await import("./_helpers.js");
      const dir = root();

      if (!path_str) {
        const bound = get_bound_project();
        if (!bound) {
          console.error("need kanban path or binding");
          process.exit(1);
        }
        // Show all kanbans overview in bound project
        const project_dir = path.join(dir, bound);
        const { kanban_list } = await import("../core/kanban.js");
        const { column_list } = await import("../core/column.js");
        const { item_list } = await import("../core/item.js");
        const kanbans = await kanban_list(project_dir);
        if (kanbans.length === 0) return console.log("(empty — no kanbans in " + bound + ")");
        console.log(`[proj: ${bound}] project overview`);
        console.log("");
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
        return;
      }

      const kanban_dir = prepend_bound(dir, path_str, force_flag());
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
    .command("cols <path>")
    .description("列出看板下的列 (格式: project/kanban)")
    .action(async (path_str) => {
      const cols = await column_list(prepend_bound(root(), path_str, force_flag()));
      if (cols.length === 0) return console.log("(empty)");
      cols.forEach((n) => console.log(n));
    });

  cmd
    .command("rm <path>")
    .description("删除看板 (格式: project/kanban)")
    .action(async (path_str) => {
      const { head: project_name, tail: rest } = split_first(path_str);
      await kanban_remove(prepend_bound(root(), project_name, force_flag()), rest);
      console.log("removed: " + project_name + "/" + rest);
    });
}
