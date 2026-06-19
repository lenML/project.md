import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';

// ── 类型定义 ───────────────────────────────────────────────────────────────

export interface HookContext {
  root_dir?: string;
  item_path?: string;
  item_name?: string;
  dest_column?: string;
  project_name?: string;
  kanban_name?: string;
}

export interface HookResult {
  ok: boolean;
  message?: string;
}

export type HookFn = (ctx: HookContext) => HookResult | Promise<HookResult>;
export type AfterHookFn = (ctx: HookContext) => void | Promise<void>;

/** 所有支持的 hook 点 */
export interface Hooks {
  before_item_move: HookFn;
  after_item_move: AfterHookFn;
  before_item_create: HookFn;
  after_item_create: AfterHookFn;
  before_item_delete: HookFn;
  after_item_delete: AfterHookFn;
  before_checkbox_toggle: HookFn;
  after_checkbox_toggle: AfterHookFn;
}

export const HOOK_NAMES: (keyof Hooks)[] = [
  'before_item_move',
  'after_item_move',
  'before_item_create',
  'after_item_create',
  'before_item_delete',
  'after_item_delete',
  'before_checkbox_toggle',
  'after_checkbox_toggle',
];

// ── 路径工具 ───────────────────────────────────────────────────────────────

/** 从 column 路径获取 kanban 目录 */
export function get_kanban_dir(column_dir: string): string {
  return path.dirname(column_dir);
}

/** 从 item 文件路径反推 kanban 目录（向上 2 层） */
export function get_kanban_dir_from_item(item_path: string): string | null {
  return path.dirname(path.dirname(item_path));
}

/** kanban 的 hooks 目录 */
export function get_hooks_dir(kanban_dir: string): string {
  return path.join(kanban_dir, '.hooks');
}

// ── 加载 .hooks/index.mjs ──────────────────────────────────────────────────

async function load_index_hooks(kanban_dir: string): Promise<Partial<Hooks>> {
  const index_path = path.join(get_hooks_dir(kanban_dir), 'index.mjs');
  if (!existsSync(index_path)) return {};

  try {
    const mod = await import(pathToFileURL(index_path).href);
    const result: Partial<Hooks> = {};
    for (const name of HOOK_NAMES) {
      if (typeof mod[name] === 'function') {
        result[name] = mod[name];
      }
    }
    return result;
  } catch {
    return {};
  }
}

// ── 加载列级钩子（向后兼容） ──────────────────────────────────────────────

async function load_column_hook(kanban_dir: string, column_name: string): Promise<HookFn | null> {
  const hook_path = path.join(get_hooks_dir(kanban_dir), column_name + '.mjs');
  if (!existsSync(hook_path)) return null;

  try {
    const mod = await import(pathToFileURL(hook_path).href);
    if (typeof mod.before_move === 'function') return mod.before_move;
    return null;
  } catch {
    return null;
  }
}

// ── 公开 API ───────────────────────────────────────────────────────────────

/**
 * 加载 kanban 的所有 hooks（index.mjs）。
 */
export async function load_hooks(kanban_dir: string): Promise<Partial<Hooks>> {
  return load_index_hooks(kanban_dir);
}

/**
 * 执行 before_* 类 hook。
 *
 * 查找顺序：
 * 1. index.mjs 中对应 hook 名
 * 2. (仅 before_item_move) .hooks/<dest_column>.mjs 的 before_move
 *
 * 未找到 hook 或 hook 返回 { ok: true } → 返回 null（放行）。
 * hook 返回 { ok: false, message } → 返回该结果。
 */
export async function run_before_hook(
  kanban_dir: string | undefined,
  hook_name: keyof Hooks,
  ctx: HookContext,
): Promise<HookResult | null> {
  if (!kanban_dir) return null;

  // 1. index.mjs
  const index_hooks = await load_index_hooks(kanban_dir);
  const fn = index_hooks[hook_name] as HookFn | undefined;
  if (fn) {
    const result = await fn(ctx);
    if (result && !result.ok) return result;
    return null; // ok or no result → 放行
  }

  // 2. 列级钩子（向后兼容，仅 before_item_move）
  if (hook_name === 'before_item_move' && ctx.dest_column) {
    const col_hook = await load_column_hook(kanban_dir, ctx.dest_column);
    if (col_hook) {
      const result = await col_hook(ctx);
      if (result && !result.ok) return result;
    }
  }

  return null;
}

/**
 * 执行 after_* 类 hook（不拦截，仅通知）。
 */
export async function run_after_hook(
  kanban_dir: string | undefined,
  hook_name: keyof Hooks,
  ctx: HookContext,
): Promise<void> {
  if (!kanban_dir) return;

  const index_hooks = await load_index_hooks(kanban_dir);
  const fn = index_hooks[hook_name] as AfterHookFn | undefined;
  if (fn) {
    await fn(ctx);
  }
}
