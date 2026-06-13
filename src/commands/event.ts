import type { Command } from "commander";
import path from "node:path";
import { list_events, type EventType } from "../core/event_log.js";

export function event_commands(program: Command): void {
  function root(): string {
    return (program.getOptionValue("dir") as string) || "";
  }

  const cmd = program.command("event").description("操作事件查询");

  cmd
    .command("ls <project>")
    .description("列出操作事件")
    .option("-t, --type <type>", "事件类型筛选")
    .option("-l, --limit <number>", "限制条数", "20")
    .action(async (project_name, options) => {
      const project_dir = path.join(root(), project_name);
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
