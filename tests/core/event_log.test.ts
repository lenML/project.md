import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { rm, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { project_init } from "../../src/core/project.js";
import { log_event, list_events, type EventRecord } from "../../src/core/event_log.js";

let tmp_dir: string;
let proj_dir: string;

beforeEach(async () => {
  tmp_dir = mkdtempSync(path.join(os.tmpdir(), "pmd-event-"));
  proj_dir = await project_init(tmp_dir, "event-test");
});

afterEach(async () => {
  await rm(tmp_dir, { recursive: true, force: true });
});

describe("log_event", () => {
  it("appends event to events.jsonl", async () => {
    const record = await log_event(proj_dir, "item_create", "test event", "content");
    expect(record.id).toMatch(/^[0-9a-f]{8}$/);
    expect(record.type).toBe("item_create");
    expect(record.title).toBe("test event");
    expect(record.content).toBe("content");
    expect(record.timestamp).toBeDefined();

    const content = await readFile(path.join(proj_dir, "events.jsonl"), "utf-8");
    expect(content).toContain(record.id);
  });

  it("supports meta field", async () => {
    const record = await log_event(proj_dir, "item_move", "move", undefined, { from: "todo", to: "done" });
    expect(record.meta).toEqual({ from: "todo", to: "done" });
  });
});

describe("list_events", () => {
  it("returns events in reverse chronological order", async () => {
    // project_init already logged 1 event; add 2 more
    await log_event(proj_dir, "project_init", "first");
    await new Promise((r) => setTimeout(r, 10));
    await log_event(proj_dir, "item_create", "second");
    const events = await list_events(proj_dir);
    expect(events).toHaveLength(3);
    expect(events[0].title).toBe("second");
    expect(events[1].title).toBe("first");
  });

  it("filters by type", async () => {
    await log_event(proj_dir, "project_init", "init");
    await log_event(proj_dir, "item_create", "create");
    const filtered = await list_events(proj_dir, { type: "item_create" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe("create");
  });

  it("respects limit", async () => {
    await log_event(proj_dir, "project_init", "a");
    await log_event(proj_dir, "item_create", "b");
    await log_event(proj_dir, "item_create", "c");
    const events = await list_events(proj_dir, { limit: 2 });
    expect(events).toHaveLength(2);
  });

  it("returns empty array when no events", async () => {
    // use a fresh dir without project_init
    const fresh_dir = path.join(tmp_dir, "empty-proj");
    await import("node:fs/promises").then(fs => fs.mkdir(fresh_dir, { recursive: true }));
    const events = await list_events(fresh_dir);
    expect(events).toEqual([]);
  });
});
