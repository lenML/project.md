import { Command } from 'commander';
import { get_default_root, ensure_dir } from './utils/fs.js';
import { project_init, project_list, project_context } from './core/project.js';
import { kanban_init, kanban_list, kanban_remove } from './core/kanban.js';
import { column_init, column_list } from './core/column.js';
import { item_new, item_list, item_show, item_move, item_remove } from './core/item.js';
import { todo_list, todo_toggle } from './core/todo.js';
import path from 'node:path';

const program = new Command();

function get_root(): string {
  return (program.getOptionValue('dir') as string) || get_default_root();
}

function split_first(input: string): { head: string; tail: string } {
  const idx = input.indexOf('/');
  if (idx === -1) return { head: input, tail: '' };
  return { head: input.slice(0, idx), tail: input.slice(idx + 1) };
}

program
  .name('pdm')
  .description('markdown-based project manager')
  .version('0.1.0')
  .option('--dir <path>', '项目根目录', get_default_root());

// ── init ──────────────────────────────────────────────────────────────────
program
  .command('init')
  .description('初始化根目录')
  .action(async () => {
    await ensure_dir(get_root());
    console.log(`root dir: ${get_root()}`);
  });

// ── project ────────────────────────────────────────────────────────────────
const project_cmd = program.command('project').description('项目管理');

project_cmd
  .command('ls')
  .description('列出所有项目')
  .action(async () => {
    const list = await project_list(get_root());
    if (list.length === 0) return console.log('(empty)');
    list.forEach(n => console.log(n));
  });

project_cmd
  .command('init <name>')
  .description('创建项目')
  .action(async (name) => {
    await project_init(get_root(), name);
    console.log(`project: ${name}`);
  });

project_cmd
  .command('context <name>')
  .description('显示项目上下文')
  .action(async (name) => {
    const ctx = await project_context(get_root(), name);
    if (ctx === null) return console.log(`project '${name}' not found`);
    console.log(ctx);
  });

// ── kanban ────────────────────────────────────────────────────────────────
const kanban_cmd = program.command('kanban').description('看板管理');

kanban_cmd
  .command('ls <project>')
  .description('列出项目下的看板')
  .action(async (project_name) => {
    const proj_dir = path.join(get_root(), project_name);
    const list = await kanban_list(proj_dir);
    if (list.length === 0) return console.log('(empty)');
    list.forEach(n => console.log(n));
  });

kanban_cmd
  .command('init <path>')
  .description('创建看板（格式：project/kanban）')
  .action(async (path_str) => {
    const { head: project_name, tail: rest } = split_first(path_str);
    const proj_dir = path.join(get_root(), project_name);
    await kanban_init(proj_dir, rest);
    console.log(`kanban: ${rest} in ${project_name}`);
  });

kanban_cmd
  .command('rm <path>')
  .description('删除看板（格式：project/kanban）')
  .action(async (path_str) => {
    const { head: project_name, tail: rest } = split_first(path_str);
    await kanban_remove(path.join(get_root(), project_name), rest);
    console.log(`removed: ${project_name}/${rest}`);
  });

// ── column ────────────────────────────────────────────────────────────────
const column_cmd = program.command('column').description('列管理');

column_cmd
  .command('ls <path>')
  .description('列出看板下的列（格式：project/kanban）')
  .action(async (path_str) => {
    const { head: project_name, tail: rest } = split_first(path_str);
    const list = await column_list(path.join(get_root(), project_name, rest));
    if (list.length === 0) return console.log('(empty)');
    list.forEach(n => console.log(n));
  });

column_cmd
  .command('init <path>')
  .description('创建列（格式：project/kanban/column）')
  .action(async (path_str) => {
    const { head: project_name, tail: rest } = split_first(path_str);
    const { head: kanban_name, tail: column_name } = split_first(rest);
    const kanban_dir = path.join(get_root(), project_name, kanban_name);
    await column_init(kanban_dir, column_name);
    console.log(`column: ${project_name}/${kanban_name}/${column_name}`);
  });

// ── item ──────────────────────────────────────────────────────────────────
const item_cmd = program.command('item').description('卡片管理');

item_cmd
  .command('ls <path>')
  .description('列出卡片（path = project/kanban/column）')
  .action(async (path_str) => {
    const list = await item_list(path.join(get_root(), path_str));
    if (list.length === 0) return console.log('(empty)');
    list.forEach(i => console.log(`${i.id}  ${i.name}`));
  });

item_cmd
  .command('new <path> <name>')
  .description('创建卡片（path = project/kanban/column）')
  .option('-d, --desc <desc>', '描述')
  .action(async (path_str, name, options) => {
    const item = await item_new(path.join(get_root(), path_str), name, options.desc);
    console.log(`created: ${item.id} ${item.file_path}`);
  });

item_cmd
  .command('show <item_path>')
  .description('显示卡片详情')
  .action(async (item_path_str) => {
    const detail = await item_show(path.join(get_root(), item_path_str));
    if (detail === null) return console.log('item not found');
    console.log(`name: ${detail.metadata.name || '(untitled)'}`);
    if (detail.metadata.desc) console.log(`desc: ${detail.metadata.desc}`);
    console.log(`---`);
    if (detail.todos.length > 0) {
      detail.todos.forEach(t => {
        const mark = t.checked ? '[x]' : '[ ]';
        console.log(`  ${mark} ${t.text}  #${t.hash}`);
      });
    }
    if (detail.body.trim()) {
      console.log(`---`);
      console.log(detail.body.trim());
    }
  });

item_cmd
  .command('mv <item_path> <dest_column>')
  .description('移动卡片到目标列')
  .action(async (item_path_str, dest_str) => {
    const src = path.join(get_root(), item_path_str);
    const dest = path.join(get_root(), dest_str);
    await item_move(src, dest);
    console.log(`moved to: ${dest_str}`);
  });

item_cmd
  .command('rm <item_path>')
  .description('删除卡片')
  .action(async (item_path_str) => {
    await item_remove(path.join(get_root(), item_path_str));
    console.log('removed');
  });

// ── todo ──────────────────────────────────────────────────────────────────
const todo_cmd = program.command('todo').description('待办项管理');

todo_cmd
  .command('ls <item_path>')
  .description('列出卡片内的待办项')
  .action(async (item_path_str) => {
    const todos = await todo_list(path.join(get_root(), item_path_str));
    if (todos.length === 0) return console.log('(empty)');
    todos.forEach(t => {
      const mark = t.checked ? '[x]' : '[ ]';
      console.log(`  ${mark} ${t.text}  #${t.hash}`);
    });
  });

todo_cmd
  .command('toggle <item_path> <hash>')
  .description('切换待办完成状态')
  .action(async (item_path_str, hash) => {
    await todo_toggle(path.join(get_root(), item_path_str), hash);
    console.log('toggled');
  });

program.parse(process.argv);
