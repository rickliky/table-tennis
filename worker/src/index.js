import { login, session } from './auth.js';
import { createDiff } from './diff.js';
import { repository } from './repository.js';
import { validateEntity, validateEnvironment } from './validation.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
const types = ['clubs', 'players', 'matches', 'external-opponents', 'tournaments', 'tournament-matches', 'tournament-progress', 'rubbers', 'pending-changes'];
const singular = type => ({ clubs: 'club', players: 'player', matches: 'match', 'external-opponents': 'externalOpponent', tournaments: 'tournament', 'tournament-matches': 'tournamentMatch', 'tournament-progress': 'tournamentProgress', rubbers: 'rubber' }[type]);
const collectionFor = entityType => ({ club: 'clubs', player: 'players', match: 'matches', externalOpponent: 'external-opponents', tournament: 'tournaments', tournamentMatch: 'tournament-matches', tournamentProgress: 'tournament-progress', rubber: 'rubbers' }[entityType]);

const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const JSON_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' };

function buildSummary(entityType, record) {
  if (!record) return '';
  switch (entityType) {
    case 'player': return [record.displayName, record.englishName, record.schoolLevel, record.grade].filter(Boolean).join(' · ');
    case 'match': return [record.player1Name, 'vs', record.player2Name, record.matchDate, record.score].filter(Boolean).join(' · ');
    case 'club': return [record.name, record.nameJa].filter(Boolean).join(' · ');
    case 'externalOpponent': return [record.displayName, record.englishName, record.affiliation].filter(Boolean).join(' · ');
    case 'tournament': return [record.name, record.date, record.location].filter(Boolean).join(' · ');
    case 'tournamentMatch': return [record.player1Name, 'vs', record.player2Name, record.matchDate].filter(Boolean).join(' · ');
    default: return record.displayName || record.name || record.matchDate || '';
  }
}

export default { async fetch(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  try {
    const url = new URL(request.url); const repo = repository(env); const environment = validateEnvironment(url.searchParams.get('environment') || 'prod');
    if (url.pathname === '/api/login' && request.method === 'POST') { const body = await request.json(); const role = body.role || 'site'; return json({ ok: true, token: await login(role, body.password, env), role }); }
    if (url.pathname === '/api/public-data' && request.method === 'GET') {
      const values = await Promise.all(types.slice(0, 8).map(type => repo.read(environment, type)));
      return json({ ok: true, club: values[0][0] || null, clubs: values[0], players: values[1], matches: values[2], externalOpponents: values[3], tournaments: values[4], tournamentMatches: values[5], tournamentProgress: values[6], rubbers: values[7], lastUpdated: new Date().toISOString() });
    }
    if (url.pathname === '/api/pending' && request.method === 'GET') return json({ ok: true, changes: await repo.read(environment, 'pending-changes') });
    if (url.pathname === '/api/clear-history' && request.method === 'POST') {
      const actor = await session(request, env);
      if (actor.role !== 'approver' && actor.role !== 'admin') throw new Error('Approver or admin role required');
      const changes = await repo.read(environment, 'pending-changes');
      const remaining = changes.filter(change => change.status === 'pending');
      await repo.write(environment, 'pending-changes', remaining);
      return json({ ok: true, deleted: changes.length - remaining.length, remaining: remaining.length });
    }
    if (url.pathname === '/api/clear-pending' && request.method === 'POST') {
      const actor = await session(request, env);
      if (actor.role !== 'admin') throw new Error('Admin role required');
      const changes = await repo.read(environment, 'pending-changes');
      const pendingCount = changes.filter(c => c.status === 'pending').length;
      await repo.write(environment, 'pending-changes', []);
      return json({ ok: true, cleared: pendingCount });
    }
    if (url.pathname === '/api/change' && request.method === 'POST') {
      const body = await request.json(); const records = {}; for (const type of types.slice(0, 8)) records[type] = await repo.read(environment, type);
      const collection = collectionFor(body.entityType); if (!collection) throw new Error('Unsupported entity type');
      if (body.action !== 'delete') validateEntity(body.entityType, body.after, { players: records.players, tournaments: records.tournaments, externalOpponents: records['external-opponents'] }, body.targetId);
      const idField = { club: 'clubId', player: 'playerId', match: 'matchId', externalOpponent: 'externalOpponentId', tournament: 'tournamentId', tournamentMatch: 'tournamentMatchId', tournamentProgress: 'tournamentProgressId', rubber: 'rubberId' }[body.entityType];
      const before = records[collection].find(item => item[idField] === body.targetId) || null;
      if (!before && body.action === 'delete') throw new Error('Record not found');
      const mergedAfter = (body.action !== 'delete' && before && body.after) ? { ...before, ...body.after } : body.after;
      const changes = await repo.read(environment, 'pending-changes');
      const existingIndex = changes.findIndex(c => c.status === 'pending' && c.entityType === body.entityType && c.targetId === body.targetId);
      const refBefore = existingIndex >= 0 ? changes[existingIndex].before : before;
      const diff = createDiff(refBefore, mergedAfter);
      if (body.action !== 'create' && body.action !== 'delete' && !diff.length) return json({ ok: true, change: null, message: 'No changes detected' });
      const changedFields = diff.map(d => d.field);
      const summary = buildSummary(body.entityType, mergedAfter || before);
      const change = { changeId: existingIndex >= 0 ? changes[existingIndex].changeId : `CHANGE-${Date.now()}`, entityType: body.entityType, action: body.action || (before ? 'update' : 'create'), targetId: body.targetId, before: refBefore, after: mergedAfter, diff, changedFields, summary, createdBy: 'admin', createdAt: existingIndex >= 0 ? changes[existingIndex].createdAt : new Date().toISOString(), status: 'pending' };
      const next = [...changes]; if (existingIndex >= 0) next[existingIndex] = change; else next.push(change);
      await repo.write(environment, 'pending-changes', next); return json({ ok: true, change });
    }
    if (url.pathname === '/api/approve' && request.method === 'POST') {
      const body = await request.json();
      if (!['accept', 'reject'].includes(body.decision)) throw new Error('Decision must be accept or reject');
      if (body.decision === 'reject') {
        const changes = await repo.read(environment, 'pending-changes');
        const change = changes.find(item => item.changeId === body.changeId && item.status === 'pending');
        if (!change) throw new Error('Pending change not found');
        await repo.write(environment, 'pending-changes', changes.map(item => item.changeId === change.changeId ? { ...item, status: 'rejected', reviewedAt: new Date().toISOString(), reviewedBy: 'submitter' } : item));
        return json({ ok: true });
      }
      const actor = await session(request, env);
      if (actor.role === 'site') throw new Error('Admin or approver role required');
      if (actor.role !== 'approver' && actor.role !== 'admin') throw new Error('Approver or admin role required');
      return json(await repo.withLock(environment, async () => {
        const changes = await repo.read(environment, 'pending-changes');
        const change = changes.find(item => item.changeId === body.changeId && item.status === 'pending');
        if (!change) throw new Error('Pending change not found');
        const collection = collectionFor(change.entityType);
        const current = await repo.read(environment, collection);
        const idField = { club: 'clubId', player: 'playerId', match: 'matchId', externalOpponent: 'externalOpponentId', tournament: 'tournamentId', tournamentMatch: 'tournamentMatchId', tournamentProgress: 'tournamentProgressId', rubber: 'rubberId' }[change.entityType];
        if (change.before && JSON.stringify(current.find(item => item[idField] === change.targetId)) !== JSON.stringify(change.before)) throw new Error('Change is stale and must be resubmitted');
        const next = current.filter(item => item[idField] !== change.targetId);
        if (change.action !== 'delete') next.push(change.after);
        await repo.write(environment, collection, next);
        await repo.write(environment, 'pending-changes', changes.map(item => item.changeId === change.changeId ? { ...item, status: 'accepted', reviewedAt: new Date().toISOString(), reviewedBy: actor.role } : item));
        return { ok: true };
      }));
    }
    if (url.pathname === '/api/bulk-rubbers' && request.method === 'POST') {
      const actor = await session(request, env);
      if (actor.role !== 'admin' && actor.role !== 'approver') throw new Error('Admin or approver role required');
      const body = await request.json();
      const { rubbers, environment: envParam } = body;
      if (!Array.isArray(rubbers) || rubbers.length === 0) throw new Error('rubbers array is required');
      const targetEnv = validateEnvironment(envParam || url.searchParams.get('environment') || 'prod');
      await repo.write(targetEnv, 'rubbers', rubbers);
      return json({ ok: true, count: rubbers.length, environment: targetEnv });
    }
    if (url.pathname === '/api/bulk-write' && request.method === 'POST') {
      const actor = await session(request, env);
      if (actor.role !== 'admin') throw new Error('Admin role required for bulk write');
      const body = await request.json();
      const { entityType, records, environment: envParam } = body;
      const collection = collectionFor(entityType);
      if (!collection) throw new Error('Unsupported entity type');
      if (!Array.isArray(records)) throw new Error('records array is required');
      const targetEnv = validateEnvironment(envParam || url.searchParams.get('environment') || 'prod');
      await repo.write(targetEnv, collection, records);
      return json({ ok: true, entityType, count: records.length, environment: targetEnv });
    }
    throw new Error('Not found');
  } catch (error) { const status = error.message === 'Authentication required' ? 401 : 400; return new Response(JSON.stringify({ ok: false, error: error.message }), { status, headers: JSON_HEADERS }); }
} };
