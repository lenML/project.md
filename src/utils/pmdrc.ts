import { readFileSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";

export type PmdrcConfig = Record<string, string>;

const RC_FILENAME = ".pmdrc";
const LEGACY_FILENAME = ".pmd-link";

/**
 * 从 start_dir 开始向上查找 .pmdrc 文件。
 * 返回找到的目录路径和文件路径，未找到返回 null。
 */
export function find_pmdrc(start_dir?: string): { dir: string; file: string } | null {
  let dir = start_dir ? path.resolve(start_dir) : process.cwd();
  const root = path.parse(dir).root;

  for (;;) {
    const candidate = path.join(dir, RC_FILENAME);
    if (existsSync(candidate)) return { dir, file: candidate };
    if (dir === root) break;
    dir = path.dirname(dir);
  }
  return null;
}

/**
 * 解析 .pmdrc 文件内容为 key-value 对象。
 * 格式：key = value，支持 # 注释。
 */
export function parse_pmdrc(content: string): PmdrcConfig {
  const config: PmdrcConfig = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq_idx = trimmed.indexOf("=");
    if (eq_idx === -1) continue;
    const key = trimmed.slice(0, eq_idx).trim();
    const value = trimmed.slice(eq_idx + 1).trim();
    if (key && value) config[key] = value;
  }
  return config;
}

/**
 * 读取并解析 start_dir 下（或向上遍历）的 .pmdrc 文件。
 */
export function read_pmdrc(start_dir?: string): PmdrcConfig | null {
  const found = find_pmdrc(start_dir);
  if (!found) return null;
  try {
    const content = readFileSync(found.file, "utf-8");
    return parse_pmdrc(content);
  } catch {
    return null;
  }
}

/**
 * 从 .pmdrc 或旧的 .pmd-link 中获取配置值。
 * 优先 .pmdrc，其次 .pmd-link（仅 project 字段）。
 */
export function get_pmdrc_value(key: string, start_dir?: string): string | null {
  const config = read_pmdrc(start_dir);
  if (config && config[key] !== undefined) return config[key];

  // 兼容旧 .pmd-link
  if (key === "project") {
    const dir = start_dir || process.cwd();
    const legacy = path.join(dir, LEGACY_FILENAME);
    try {
      return readFileSync(legacy, "utf-8").trim() || null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * 写入 .pmdrc 到指定目录。
 * 如果文件已存在，合并写入（保留其他 key）。
 */
export function write_pmdrc(dir: string, updates: PmdrcConfig): void {
  // 优先更新已存在的 .pmdrc（可能在父目录），否则在 dir 创建
  const found = find_pmdrc(dir);
  const file_path = found ? found.file : path.join(dir, RC_FILENAME);
  let existing: PmdrcConfig = {};

  try {
    const content = readFileSync(file_path, "utf-8");
    existing = parse_pmdrc(content);
  } catch {
    // 文件不存在
  }

  const merged = { ...existing, ...updates };
  const lines = Object.entries(merged).map(([k, v]) => k + " = " + v);
  writeFileSync(file_path, lines.join("\n") + "\n", "utf-8");
}

/**
 * 从 .pmdrc 中删除指定 key。
 * 如果删除后文件为空，删除文件本身。
 */
export function remove_pmdrc_key(dir: string, key: string): void {
  // 找到真正的 .pmdrc 位置（可能在父目录）
  const found = find_pmdrc(dir);
  const file_path = found ? found.file : path.join(dir, RC_FILENAME);
  try {
    const content = readFileSync(file_path, "utf-8");
    const config = parse_pmdrc(content);
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete config[key];

    if (Object.keys(config).length === 0) {
      try { unlinkSync(file_path); } catch { /* ignore */ }
    } else {
      const lines = Object.entries(config).map(([k, v]) => k + " = " + v);
      writeFileSync(file_path, lines.join("\n") + "\n", "utf-8");
    }
  } catch {
    // 文件不存在忽略
  }
}
