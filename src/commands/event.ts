import type { Command } from "commander";
import { list_events, type EventType } from "../core/event_log.js";
import { require_project_dir } from "./_helpers.js";

export function event_commands(program: Command): void {
  function root(): string {
    return (program.getOptionValue("dir") as string) || "";
  }

  const cmd = program.command("event").description("操作事件查询");

  cmd
    .command("ls")
    .description("列出操作事件（使用 -p/--project）")
    .option("-t, --type <type>", "事件类型筛选")
    .option("-l, --limit <number>", "限制条数", "20")
    .action(async (options) => {
      const project_dir = require_project_dir(root(), program);
      const query: { limit?: number; offset?: number; type?: EventType } = {};
      if (options.type) query.type = options.type as EventType;
      if (options.limit) query.limit = parseInt(options.limit, 10);
      const events = await list_events(project_dir, query);
      if (events.length === 0) return console.log("(empty)");
      for (const e of events) {
        const ts = new Date(e.timestamp).toLocaleString("zh-CN");
        const detail = e.type === "item_move" && e.meta?.from && e.meta?.to
          ? `  (${e.meta.from as string} → ${e.meta.to as string})`
          : "";
        console.log(`${e.id}  ${ts}  [${e.type}]  ${e.title}${detail}`);
        if (e.content) console.log("   " + e.content);
      }
    });
}
