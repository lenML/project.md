import type { Command } from 'commander';
import { list_events, type EventType } from '../core/event_log.js';
import { require_project_dir } from './_helpers.js';
import { format_relative_time } from '../utils/fs.js';

export function event_commands(program: Command): void {
  function root(): string {
    return (program.getOptionValue('dir') as string) || '';
  }

  const cmd = program.command('event').description('操作事件查询');

  cmd
    .command('ls')
    .description('列出操作事件（使用 -p/--project）')
    .option('-t, --type <type>', '事件类型筛选')
    .option('-l, --limit <number>', '限制条数', '20')
    .option('--json', 'JSON 格式输出')
    .option('--from <datetime>', '起始时间 (ISO 8601)')
    .option('--to <datetime>', '结束时间 (ISO 8601)')
    .action(async (options) => {
      const project_dir = require_project_dir(root(), program);
      const query: {
        limit?: number;
        offset?: number;
        type?: EventType;
        from?: string;
        to?: string;
      } = {};
      if (options.type) query.type = options.type as EventType;
      if (options.limit) query.limit = parseInt(options.limit, 10);
      if (options.from) query.from = options.from;
      if (options.to) query.to = options.to;
      const events = await list_events(project_dir, query);
      if (events.length === 0) return console.log('(empty)');
      if (options.json) {
        console.log(JSON.stringify(events, null, 2));
        return;
      }
      for (const e of events) {
        const ts = format_relative_time(e.timestamp);
        const detail =
          e.type === 'item_move' && e.meta?.from && e.meta?.to
            ? `  (${e.meta.from as string} → ${e.meta.to as string})`
            : '';
        console.log(`${e.id}  ${ts}  [${e.type}]  ${e.title}${detail}`);
        if (e.content) console.log('   ' + e.content);
      }
    });
}
