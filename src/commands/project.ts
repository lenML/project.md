import type { Command } from 'commander';
import path from 'node:path';
import {
  project_init,
  project_list,
  project_context,
  get_project_config,
  project_bind,
  project_unbind,
  get_bound_project,
} from '../core/project.js';

export function project_commands(program: Command): void {
  function root(): string {
    return (program.getOptionValue('dir') as string) || '';
  }
  function force_flag(): boolean {
    return (program.getOptionValue('force') as boolean) || false;
  }

  const cmd = program.command('project').description('项目管理');

  cmd
    .command('ls')
    .description('列出所有项目')
    .action(async () => {
      const bound = get_bound_project();
      if (bound) console.log('[proj: ' + bound + '] (bound)');
      const list = await project_list(root());
      if (list.length === 0) return console.log('(empty)');
      list.forEach((n) => {
        if (bound && n === bound) console.log('  * ' + n + ' (当前绑定)');
        else console.log('  ' + n);
      });
    });

  cmd
    .command('init <name>')
    .description('创建项目')
    .action(async (name) => {
      const bound = get_bound_project();
      if (bound && !force_flag()) {
        console.error(`[proj: ${bound}] (bound)`);
        throw new Error(
          `cannot init project while bound to "${bound}". Run "pmd project unbind" first, or use --force to override.`,
        );
      }
      await project_init(root(), name);
      if (bound) console.log('[proj: ' + bound + '] (bound)');
      console.log('project: ' + name);
    });

  cmd
    .command('context <name>')
    .description('显示项目上下文')
    .action(async (name) => {
      const ctx = await project_context(root(), name);
      if (ctx === null) return console.log("project '" + name + "' not found");
      console.log(ctx);
    });

  cmd
    .command('config <name>')
    .description('显示项目配置')
    .action(async (name) => {
      const project_dir = path.join(root(), name);
      const config = await get_project_config(project_dir);
      if (!config.name) return console.log("project '" + name + "' not found");
      console.log('name: ' + config.name);
      if (config.description) console.log('desc: ' + config.description);
    });

  cmd
    .command('bind <name>')
    .description('绑定当前目录到项目')
    .action(async (name) => {
      await project_bind(root(), name);
      console.log('[proj: ' + name + '] 已绑定');
    });

  cmd
    .command('unbind')
    .description('解除项目绑定')
    .action(async () => {
      await project_unbind();
      const bound = get_bound_project();
      if (bound) console.log('[proj: ' + bound + '] 已解除');
      else console.log('当前无绑定');
    });
}
