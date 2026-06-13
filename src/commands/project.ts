import type { Command } from "commander";
import path from "node:path";
import { project_init, project_list, project_context, get_project_config } from "../core/project.js";

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
  cmd
    .command("config <name>")
    .description("显示项目配置")
    .action(async (name) => {
      const project_dir = path.join(root(), name);
      const config = await get_project_config(project_dir);
      if (!config.name) return console.log("project '" + name + "' not found");
      console.log("name: " + config.name);
      if (config.description) console.log("desc: " + config.description);
    });
}
