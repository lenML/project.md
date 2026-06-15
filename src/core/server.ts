import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import path from "node:path";
import { project_list } from "./project.js";
import { kanban_list } from "./kanban.js";
import { column_list } from "./column.js";
import { item_list, item_show, item_new, item_move } from "./item.js";
import { checkbox_list, checkbox_toggle } from "./checkbox.js";
import { list_events, log_event } from "./event_log.js";

export interface ServerOptions {
  dir: string;
  port: number;
  token?: string;
}

function json(res: ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

function error(res: ServerResponse, msg: string, status = 400) {
  json(res, { error: msg }, status);
}

function get_token(req: IncomingMessage): string | null {
  const auth = req.headers["authorization"];
  if (!auth) return null;
  const parts = auth.split(" ");
  return parts[1] || null;
}

export async function start_server(opts: ServerOptions): Promise<void> {
  const { dir, port, token } = opts;

  const srv = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const parts = url.pathname.split("/").filter(Boolean);
      const method = req.method || "GET";

      // Auth
      if (token) {
        const req_token = get_token(req);
        if (req_token !== token) {
          json(res, { error: "unauthorized" }, 401);
          return;
        }
      }

      // CORS preflight
      if (method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
        });
        res.end();
        return;
      }

      // Parse body for POST
      let body = "";
      if (method === "POST" || method === "PUT") {
        for await (const chunk of req) body += chunk;
      }
      let body_json: Record<string, unknown> = {};
      try { if (body) body_json = JSON.parse(body); } catch { /* ignore */ }

      // Routes
      if (parts[0] === "projects" && parts.length === 1 && method === "GET") {
        const list = await project_list(dir);
        json(res, list);
        return;
      }

      if (parts[0] === "kanbans" && parts.length === 1 && method === "GET") {
        const proj = body_json.project as string || url.searchParams.get("project") || "";
        if (!proj) { error(res, "need project"); return; }
        const list = await kanban_list(path.join(dir, proj));
        json(res, list);
        return;
      }

      if (parts[0] === "columns" && parts.length === 1 && method === "GET") {
        const proj = body_json.project as string || url.searchParams.get("project") || "";
        if (!proj) { error(res, "need project"); return; }
        const list = await kanban_list(path.join(dir, proj));
        json(res, list);
        return;
      }

      if (parts[0] === "columns" && parts.length === 1 && method === "GET") {
        const proj = body_json.project as string || url.searchParams.get("project") || "";
        const kanban = body_json.kanban as string || url.searchParams.get("kanban") || "";
        if (!proj || !kanban) { error(res, "need project+kanban"); return; }
        const list = await column_list(path.join(dir, proj, kanban));
        json(res, list);
        return;
      }

      if (parts[0] === "items" && parts.length === 1 && method === "GET") {
        const proj = body_json.project as string || url.searchParams.get("project") || "";
        const kanban = body_json.kanban as string || url.searchParams.get("kanban") || "";
        const col = body_json.col as string || url.searchParams.get("col") || "";
        if (!proj || !kanban || !col) { error(res, "need project+kanban+col"); return; }
        const list = await item_list(path.join(dir, proj, kanban, col));
        json(res, list);
        return;
      }

      if (parts[0] === "item" && parts.length === 1 && method === "POST") {
        const proj = body_json.project as string || "";
        const kanban = body_json.kanban as string || "";
        const col = body_json.col as string || "";
        const name = body_json.name as string || "";
        const desc = body_json.desc as string || "";
        if (!proj || !kanban || !col || !name) { error(res, "need project+kanban+col+name"); return; }
        const result = await item_new(path.join(dir, proj, kanban, col), name, desc || undefined);
        json(res, result, 201);
        await log_event(path.join(dir, proj), "item_create", "创建卡片: " + name);
        return;
      }

      if (parts[0] === "item" && parts[1] === "move" && method === "POST") {
        const from = body_json.from as string || "";
        const to = body_json.to as string || "";
        if (!from || !to) { error(res, "need from+to paths"); return; }
        const result = await item_move(from, to);
        json(res, { moved: result });
        return;
      }

      if (parts[0] === "checkbox" && parts[1] === "list" && method === "POST") {
        const item_path = body_json.item_path as string || "";
        if (!item_path) { error(res, "need item_path"); return; }
        const list = await checkbox_list(item_path);
        json(res, list);
        return;
      }

      if (parts[0] === "checkbox" && parts[1] === "toggle" && method === "POST") {
        const item_path = body_json.item_path as string || "";
        const hashes = body_json.hashes as string[] || [];
        if (!item_path || hashes.length === 0) { error(res, "need item_path+hashes"); return; }
        await checkbox_toggle(item_path, ...hashes);
        json(res, { ok: true });
        return;
      }

      if (parts[0] === "events" && method === "GET") {
        const proj = body_json.project as string || url.searchParams.get("project") || "";
        if (!proj) { error(res, "need project"); return; }
        const events = await list_events(path.join(dir, proj), { limit: 50 });
        json(res, events);
        return;
      }

      // 404
      json(res, { error: "not found", path: url.pathname }, 404);
    } catch (e: unknown) {
      error(res, e instanceof Error ? e.message : String(e), 500);
    }
  });

  return new Promise((resolve) => {
    srv.listen(port, () => {
      console.log(`pmd server running on http://localhost:${port}`);
      if (token) console.log(`auth token: ${token}`);
      console.log(`root dir: ${dir}`);
    });
  });
}
