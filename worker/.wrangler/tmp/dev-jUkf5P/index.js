var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/auth.js
var encoder = new TextEncoder();
async function signature(value, secret) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  return btoa(String.fromCharCode(...bytes));
}
__name(signature, "signature");
async function login(role, password, env) {
  const expected = role === "admin" ? env.ADMIN_PASSWORD : role === "approver" ? env.APPROVER_PASSWORD : role === "site" ? env.SITE_PASSWORD : "";
  if (!expected || password !== expected) throw new Error("Invalid credentials");
  const payload = btoa(JSON.stringify({ role, expires: Date.now() + 8 * 60 * 60 * 1e3 }));
  return `${payload}.${await signature(payload, env.SESSION_SECRET)}`;
}
__name(login, "login");
async function session(request, env) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Authentication required");
  const [payload, supplied] = token.split(".");
  if (!payload || supplied !== await signature(payload, env.SESSION_SECRET)) throw new Error("Invalid session");
  const value = JSON.parse(atob(payload));
  if (value.expires < Date.now() || !["site", "admin", "approver"].includes(value.role)) throw new Error("Session expired");
  return value;
}
__name(session, "session");

// src/diff.js
function createDiff(before, after) {
  const keys = /* @__PURE__ */ new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  return [...keys].filter((key) => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])).map((field) => ({ field, before: before?.[field] ?? "", after: after?.[field] ?? "" }));
}
__name(createDiff, "createDiff");

// src/repository.js
function repository(env) {
  const url = env.UPSTASH_REDIS_REST_URL.replace(/\/$/, "");
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  const headers = { Authorization: `Bearer ${token}` };
  const get = /* @__PURE__ */ __name((key2) => fetch(`${url}/get/${encodeURIComponent(key2)}`, { headers }).then(async (r) => {
    const d = await r.json();
    return d.result;
  }), "get");
  const set = /* @__PURE__ */ __name((key2, value) => fetch(`${url}/set/${encodeURIComponent(key2)}`, { method: "POST", headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" }, body: value }).then((r) => r.json()), "set");
  const del = /* @__PURE__ */ __name((key2) => fetch(`${url}/del/${encodeURIComponent(key2)}`, { method: "POST", headers }).then((r) => r.json()), "del");
  const setnxex = /* @__PURE__ */ __name((key2, value, ex) => fetch(`${url}/setnxex/${encodeURIComponent(key2)}/${encodeURIComponent(value)}/${ex}`, { method: "POST", headers }).then((r) => r.json()), "setnxex");
  const key = /* @__PURE__ */ __name((environment, type) => `${environment}:${type}`, "key");
  const read = /* @__PURE__ */ __name(async (environment, type) => {
    const result = await get(key(environment, type));
    return result ? JSON.parse(result) : [];
  }, "read");
  const write = /* @__PURE__ */ __name((environment, type, value) => set(key(environment, type), JSON.stringify(value)), "write");
  const withLock = /* @__PURE__ */ __name(async (environment, callback) => callback(), "withLock");
  return { read, write, withLock };
}
__name(repository, "repository");

// src/validation.js
function validateEntity(entityType, record, data, targetId = record?.[{ club: "clubId", player: "playerId", match: "matchId", externalOpponent: "externalOpponentId", tournament: "tournamentId", tournamentMatch: "tournamentMatchId", tournamentProgress: "tournamentProgressId", rubber: "rubberId" }[entityType]]) {
  if (!record || typeof record !== "object") throw new Error("Record is required");
  const idField = { club: "clubId", player: "playerId", match: "matchId", externalOpponent: "externalOpponentId", tournament: "tournamentId", tournamentMatch: "tournamentMatchId", tournamentProgress: "tournamentProgressId", rubber: "rubberId" }[entityType];
  if (!idField || !record[idField]) throw new Error("A valid record ID is required");
  if (record[idField] !== targetId) throw new Error("Target ID does not match record ID");
  if (entityType === "match") {
    if (!record.player1Id || !record.player2Id || record.player1Id === record.player2Id) throw new Error("A match requires two different players");
    if (![record.player1Sets, record.player2Sets].every((value) => Number.isInteger(Number(value)) && Number(value) >= 0)) throw new Error("Set counts must be non-negative integers");
    if (!data.players.some((item) => item.playerId === record.player1Id) || !data.players.some((item) => item.playerId === record.player2Id)) throw new Error("Match players must exist");
  }
  if (entityType === "tournamentMatch" && (!data.tournaments.some((item) => item.tournamentId === record.tournamentId) || !data.players.some((item) => item.playerId === record.lkPlayerId) || !data.externalOpponents.some((item) => item.externalOpponentId === record.externalOpponentId))) throw new Error("Tournament match references an unknown record");
  return record;
}
__name(validateEntity, "validateEntity");
function validateEnvironment(value) {
  if (value !== "uat" && value !== "prod") throw new Error("Invalid environment");
  return value;
}
__name(validateEnvironment, "validateEnvironment");

// src/index.js
var json = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS }), "json");
var types = ["clubs", "players", "matches", "external-opponents", "tournaments", "tournament-matches", "tournament-progress", "rubbers", "pending-changes"];
var collectionFor = /* @__PURE__ */ __name((entityType) => ({ club: "clubs", player: "players", match: "matches", externalOpponent: "external-opponents", tournament: "tournaments", tournamentMatch: "tournament-matches", tournamentProgress: "tournament-progress", rubber: "rubbers" })[entityType], "collectionFor");
var CORS_HEADERS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
var JSON_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" };
function buildSummary(entityType, record) {
  if (!record) return "";
  switch (entityType) {
    case "player":
      return [record.displayName, record.englishName, record.schoolLevel, record.grade].filter(Boolean).join(" \xB7 ");
    case "match":
      return [record.player1Name, "vs", record.player2Name, record.matchDate, record.score].filter(Boolean).join(" \xB7 ");
    case "club":
      return [record.name, record.nameJa].filter(Boolean).join(" \xB7 ");
    case "externalOpponent":
      return [record.displayName, record.englishName, record.affiliation].filter(Boolean).join(" \xB7 ");
    case "tournament":
      return [record.name, record.date, record.location].filter(Boolean).join(" \xB7 ");
    case "tournamentMatch":
      return [record.player1Name, "vs", record.player2Name, record.matchDate].filter(Boolean).join(" \xB7 ");
    default:
      return record.displayName || record.name || record.matchDate || "";
  }
}
__name(buildSummary, "buildSummary");
var src_default = { async fetch(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  try {
    const url = new URL(request.url);
    const repo = repository(env);
    const environment = validateEnvironment(url.searchParams.get("environment") || "prod");
    if (url.pathname === "/api/login" && request.method === "POST") {
      const body = await request.json();
      const role = body.role || "site";
      return json({ ok: true, token: await login(role, body.password, env), role });
    }
    if (url.pathname === "/api/public-data" && request.method === "GET") {
      const values = await Promise.all(types.slice(0, 8).map((type) => repo.read(environment, type)));
      return json({ ok: true, club: values[0][0] || null, clubs: values[0], players: values[1], matches: values[2], externalOpponents: values[3], tournaments: values[4], tournamentMatches: values[5], tournamentProgress: values[6], rubbers: values[7], lastUpdated: (/* @__PURE__ */ new Date()).toISOString() });
    }
    if (url.pathname === "/api/pending" && request.method === "GET") return json({ ok: true, changes: await repo.read(environment, "pending-changes") });
    if (url.pathname === "/api/change" && request.method === "POST") {
      const body = await request.json();
      const records = {};
      for (const type of types.slice(0, 8)) records[type] = await repo.read(environment, type);
      const collection = collectionFor(body.entityType);
      if (!collection) throw new Error("Unsupported entity type");
      if (body.action !== "delete") validateEntity(body.entityType, body.after, { players: records.players, tournaments: records.tournaments, externalOpponents: records["external-opponents"] }, body.targetId);
      const idField = { club: "clubId", player: "playerId", match: "matchId", externalOpponent: "externalOpponentId", tournament: "tournamentId", tournamentMatch: "tournamentMatchId", tournamentProgress: "tournamentProgressId", rubber: "rubberId" }[body.entityType];
      const before = records[collection].find((item) => item[idField] === body.targetId) || null;
      if (!before && body.action === "delete") throw new Error("Record not found");
      const mergedAfter = body.action !== "delete" && before && body.after ? { ...before, ...body.after } : body.after;
      const changes = await repo.read(environment, "pending-changes");
      const existingIndex = changes.findIndex((c) => c.status === "pending" && c.entityType === body.entityType && c.targetId === body.targetId);
      const refBefore = existingIndex >= 0 ? changes[existingIndex].before : before;
      const diff = createDiff(refBefore, mergedAfter);
      if (body.action !== "create" && body.action !== "delete" && !diff.length) return json({ ok: true, change: null, message: "No changes detected" });
      const changedFields = diff.map((d) => d.field);
      const summary = buildSummary(body.entityType, mergedAfter || before);
      const change = { changeId: existingIndex >= 0 ? changes[existingIndex].changeId : `CHANGE-${Date.now()}`, entityType: body.entityType, action: body.action || (before ? "update" : "create"), targetId: body.targetId, before: refBefore, after: mergedAfter, diff, changedFields, summary, createdBy: "admin", createdAt: existingIndex >= 0 ? changes[existingIndex].createdAt : (/* @__PURE__ */ new Date()).toISOString(), status: "pending" };
      const next = [...changes];
      if (existingIndex >= 0) next[existingIndex] = change;
      else next.push(change);
      await repo.write(environment, "pending-changes", next);
      return json({ ok: true, change });
    }
    if (url.pathname === "/api/approve" && request.method === "POST") {
      const body = await request.json();
      if (!["accept", "reject"].includes(body.decision)) throw new Error("Decision must be accept or reject");
      if (body.decision === "reject") {
        const changes = await repo.read(environment, "pending-changes");
        const change = changes.find((item) => item.changeId === body.changeId && item.status === "pending");
        if (!change) throw new Error("Pending change not found");
        await repo.write(environment, "pending-changes", changes.map((item) => item.changeId === change.changeId ? { ...item, status: "rejected", reviewedAt: (/* @__PURE__ */ new Date()).toISOString(), reviewedBy: "submitter" } : item));
        return json({ ok: true });
      }
      const actor = await session(request, env);
      if (actor.role === "site") throw new Error("Admin or approver role required");
      if (actor.role !== "approver" && actor.role !== "admin") throw new Error("Approver or admin role required");
      return json(await repo.withLock(environment, async () => {
        const changes = await repo.read(environment, "pending-changes");
        const change = changes.find((item) => item.changeId === body.changeId && item.status === "pending");
        if (!change) throw new Error("Pending change not found");
        const collection = collectionFor(change.entityType);
        const current = await repo.read(environment, collection);
        const idField = { club: "clubId", player: "playerId", match: "matchId", externalOpponent: "externalOpponentId", tournament: "tournamentId", tournamentMatch: "tournamentMatchId", tournamentProgress: "tournamentProgressId", rubber: "rubberId" }[change.entityType];
        if (change.before && JSON.stringify(current.find((item) => item[idField] === change.targetId)) !== JSON.stringify(change.before)) throw new Error("Change is stale and must be resubmitted");
        const next = current.filter((item) => item[idField] !== change.targetId);
        if (change.action !== "delete") next.push(change.after);
        await repo.write(environment, collection, next);
        await repo.write(environment, "pending-changes", changes.map((item) => item.changeId === change.changeId ? { ...item, status: "accepted", reviewedAt: (/* @__PURE__ */ new Date()).toISOString(), reviewedBy: actor.role } : item));
        return { ok: true };
      }));
    }
    if (url.pathname === "/api/bulk-rubbers" && request.method === "POST") {
      const actor = await session(request, env);
      if (actor.role !== "admin" && actor.role !== "approver") throw new Error("Admin or approver role required");
      const body = await request.json();
      const { rubbers, environment: envParam } = body;
      if (!Array.isArray(rubbers) || rubbers.length === 0) throw new Error("rubbers array is required");
      const targetEnv = validateEnvironment(envParam || url.searchParams.get("environment") || "prod");
      await repo.write(targetEnv, "rubbers", rubbers);
      return json({ ok: true, count: rubbers.length, environment: targetEnv });
    }
    throw new Error("Not found");
  } catch (error) {
    const status = error.message === "Authentication required" ? 401 : 400;
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status, headers: JSON_HEADERS });
  }
} };

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-QH99gt/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-QH99gt/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
