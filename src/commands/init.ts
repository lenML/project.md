import type { Command } from "commander";
import { get_default_root, ensure_dir } from "../utils/fs.js";

export function init_command(program: Command): void {
  program
    .command("init")
    .description("初始化根目录")
    .action(async () => {
      const root = (program.getOptionValue("dir") as string) || get_default_root();
      await ensure_dir(root);
      console.log("root dir: " + root);
    });
}