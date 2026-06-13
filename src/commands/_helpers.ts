/**
 * 将 "a/b/c" 拆为 { head: "a", tail: "b/c" }
 */
export function split_first(input: string): { head: string; tail: string } {
  const idx = input.indexOf("/");
  if (idx === -1) return { head: input, tail: "" };
  return { head: input.slice(0, idx), tail: input.slice(idx + 1) };
}