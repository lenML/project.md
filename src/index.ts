import { Command } from "commander";
import { get_default_root } from "./utils/fs.js";
import { init_command } from "./commands/init.js";
import { project_commands } from "./commands/project.js";
import { kanban_commands } from "./commands/kanban.js";
import { column_commands } from "./commands/column.js";
import { item_commands } from "./commands/item.js";
import { checkbox_commands } from "./commands/checkbox.js";
import { event_commands } from "./commands/event.js";
import { server_command } from "./commands/server.js";

const program = new Command();

program
  .name("pmd")
  .description("markdown-based project manager")
  .version("0.1.0")
  .option("--dir <path>", "项目根目录", get_default_root())
  .option("-p, --project <name>", "项目名（默认使用绑定）")
  .option("-k, --kanban <name>", "看板名")
  .option("-c, --col <name>", "列名")
  .option("--force", "跳过项目绑定检查");

init_command(program);
project_commands(program);
kanban_commands(program);
column_commands(program);
item_commands(program);
checkbox_commands(program);
event_commands(program);
server_command(program);

program.parse(process.argv);
