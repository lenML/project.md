import type { Command } from "commander";
import { start_server } from "../core/server.js";

export function server_command(program: Command): void {
  function root(): string {
    return (program.getOptionValue("dir") as string) || "";
  }

  const cmd = program.command("server").description("启动 HTTP 服务");

  cmd
    .command("start")
    .description("启动服务")
    .option("-p, --port <number>", "端口", "3737")
    .option("-t, --token <token>", "认证 token（可选）")
    .action(async (options) => {
      const dir = root();
      const port = parseInt(options.port, 10);
      const token = options.token || undefined;
      await start_server({ dir, port, token });
      console.log("server started on port " + port);
    });
}