import { createHash } from 'node:crypto';

/**
 * 计算字符串的 sha256 前 8 位 hex。
 * @param text - 输入文本
 * @returns 8 字符 hex 字符串
 */
export function short_hash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 8);
}
