import type { Command } from "commander";
import { project_init, project_list, project_context } from "../core/project.js";

export function project_commands(program: Command): void {
  function root(): string {
    return (program.getOptionValue("dir") as string) || "";
  }

  const cmd = program.command("project").description("项目管理");

  cmd
    .command("ls")
    .description("列出所有项目")
    .action(async () => {
      const list = await project_list(root());
      if (list.length === 0) return console.log("(empty)");
      list.forEach((n) => console.log(n));
    });

  cmd
    .command("init <name>")
    .description("创建项目")
    .action(async (name) => {
      await project_init(root(), name);
      console.log("project: " + name);
    });

  cmd
    .command("context <name>")
    .description("显示项目上下文")
    .action(async (name) => {
      const ctx = await project_context(root(), name);
      if (ctx === null) return console.log("project '" + name + "' not found");
      console.log(ctx);
    });
}