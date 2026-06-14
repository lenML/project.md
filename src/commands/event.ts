import type { Command } from "commander";
import path from "node:path";
import { prepend_bound } from "./_helpers.js";
import { list_events, type EventType } from "../core/event_log.js";

export function event_commands(program: Command): void {
  function root(): string {
    return (program.getOptionValue("dir") as string) || "";
  }
  function force_flag(): boolean {
    return (program.getOptionValue("force") as boolean) || false;
  }

  const cmd = program.command("event").description("操作事件查询");

  cmd
    .command("ls [project]")
    .description("列出操作事件（绑定后可省略 project）")
    .option("-t, --type <type>", "事件类型筛选")
    .option("-l, --limit <number>", "限制条数", "20")
    .action(async (project_name, options) => {
      const dir = root();
      let project_dir: string;
      if (!project_name) {
        const { get_bound_project } = await import("./_helpers.js");
        project_name = get_bound_project();
        if (!project_name) {
          console.error("need project name or binding");
          process.exit(1);
        }
        project_dir = path.join(dir, project_name);
        console.log(`[proj: ${project_name}] (bound)`);
      } else {
        project_dir = prepend_bound(dir, project_name, force_flag());
      }
      const query: { limit?: number; offset?: number; type?: EventType } = {};
      if (options.type) query.type = options.type as EventType;
      if (options.limit) query.limit = parseInt(options.limit, 10);
      const events = await list_events(project_dir, query);
      if (events.length === 0) return console.log("(empty)");
      for (const e of events) {
        const ts = new Date(e.timestamp).toLocaleString("zh-CN");
        console.log(`${e.id}  ${ts}  [${e.type}]  ${e.title}`);
        if (e.content) console.log("   " + e.content);
      }
    });
}
