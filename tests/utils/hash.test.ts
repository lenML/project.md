import { describe, it, expect } from 'vitest';
import { short_hash } from '../../src/utils/hash.js';

describe('short_hash', () => {
  /**
   * Basic hash
   * Given a string "hello"
   * When short_hash("hello") is called
   * Then it returns an 8-character hex string
   */
  it('returns 8-char hex for basic string', () => {
    const result = short_hash('hello');
    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  /**
   * Deterministic
   * Given the same string "hello" twice
   * When short_hash is called both times
   * Then both results are identical
   */
  it('is deterministic for same input', () => {
    expect(short_hash('hello')).toBe(short_hash('hello'));
  });

  /**
   * Different inputs
   * Given two different strings "hello" and "world"
   * When short_hash is called
   * Then results differ
   */
  it('produces different output for different input', () => {
    expect(short_hash('hello')).not.toBe(short_hash('world'));
  });

  /**
   * Empty string
   * Given an empty string ""
   * When short_hash("") is called
   * Then it returns an 8-char hex string
   */
  it('handles empty string', () => {
    const result = short_hash('');
    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });
});
