import { login, requireRole, session } from './auth.js';
import { createDiff } from './diff.js';
import { repository } from './repository.js';
import { validateEntity, validateEnvironment } from './validation.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
const types = ['clubs', 'players', 'matches', 'external-opponents', 'tournaments', 'tournament-matches', 'tournament-progress', 'rubbers', 'session-feedback', 'match-feedback', 'sessions', 'import-batches', 'pending-changes'];
const publicTypes = types.filter(type => type !== 'pending-changes');
const singular = type => ({ clubs: 'club', players: 'player', matches: 'match', 'external-opponents': 'externalOpponent', tournaments: 'tournament', 'tournament-matches': 'tournamentMatch', 'tournament-progress': 'tournamentProgress', rubbers: 'rubber', 'session-feedback': 'sessionFeedback', 'match-feedback': 'matchFeedback', sessions: 'session', 'import-batches': 'importBatch' }[type]);
const collectionFor = entityType => ({ club: 'clubs', player: 'players', match: 'matches', externalOpponent: 'external-opponents', tournament: 'tournaments', tournamentMatch: 'tournament-matches', tournamentProgress: 'tournament-progress', rubber: 'rubbers', sessionFeedback: 'session-feedback', matchFeedback: 'match-feedback', session: 'sessions', importBatch: 'import-batches' }[entityType]);
const idFieldFor = entityType => ({ club: 'clubId', player: 'playerId', match: 'matchId', externalOpponent: 'externalOpponentId', tournament: 'tournamentId', tournamentMatch: 'tournamentMatchId', tournamentProgress: 'tournamentProgressId', rubber: 'rubberId', sessionFeedback: 'feedbackId', matchFeedback: 'matchFeedbackId', session: 'sessionId', importBatch: 'importBatchId' }[entityType]);

const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const JSON_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const activePlayerStatuses = new Set(['ST-001', 'Active', '有効']);
const securityEnabled = (environment, env) => environment === 'uat' || env.SECURE_PROD === 'true';

async function readData(repo, environment, includeInactivePlayers) {
  const values = await Promise.all(publicTypes.map(type => repo.read(environment, type)));
  const players = includeInactivePlayers ? values[1] : values[1].filter(player => activePlayerStatuses.has(player.status));
  return { ok: true, club: values[0][0] || null, clubs: values[0], players, matches: values[2], externalOpponents: values[3], tournaments: values[4], tournamentMatches: values[5], tournamentProgress: values[6], rubbers: values[7], sessionFeedback: values[8], matchFeedback: values[9], sessions: values[10], importBatches: values[11], lastUpdated: new Date().toISOString() };
}

function buildSummary(entityType, record) {
  if (!record) return '';
  switch (entityType) {
    case 'player': return [record.displayName, record.englishName, record.schoolLevel, record.grade].filter(Boolean).join(' · ');
    case 'match': return [record.player1Name, 'vs', record.player2Name, record.matchDate, record.score].filter(Boolean).join(' · ');
    case 'club': return [record.name, record.nameJa].filter(Boolean).join(' · ');
    case 'externalOpponent': return [record.displayName, record.englishName, record.affiliation].filter(Boolean).join(' · ');
    case 'tournament': return [record.name, record.date, record.location].filter(Boolean).join(' · ');
    case 'tournamentMatch': return [record.player1Name, 'vs', record.player2Name, record.matchDate].filter(Boolean).join(' · ');
    case 'sessionFeedback': return [record.playerName, record.sessionDate, `Effort ${record.effort}/5`, `Confidence ${record.confidence}/5`].filter(Boolean).join(' · ');
    case 'matchFeedback': return [record.playerName, 'vs', record.opponentName, record.matchDate, record.score].filter(Boolean).join(' · ');
    case 'session': return [record.sessionDate, record.venue, record.sessionType, record.matchFormat].filter(Boolean).join(' · ');
    case 'importBatch': return [record.sourceName, record.sessionDate, `${record.rowCount} rows`].filter(Boolean).join(' · ');
    default: return record.displayName || record.name || record.matchDate || '';
  }
}

export default { async fetch(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  try {
    const url = new URL(request.url); const repo = repository(env); const environment = validateEnvironment(url.searchParams.get('environment') || 'prod');
    if (url.pathname === '/api/login' && request.method === 'POST') { const body = await request.json(); const role = body.role || 'site'; return json({ ok: true, token: await login(role, body.password, env), role }); }
    if (url.pathname === '/api/session' && request.method === 'GET') { const actor = await session(request, env); return json({ ok: true, role: actor.role, expires: actor.expires }); }
    if (url.pathname === '/api/public-data' && request.method === 'GET') {
      if (securityEnabled(environment, env)) await session(request, env);
      return json(await readData(repo, environment, false));
    }
    if (url.pathname === '/api/admin-data' && request.method === 'GET') {
      await requireRole(request, env, ['admin', 'approver']);
      return json(await readData(repo, environment, true));
    }
    if (url.pathname === '/api/pending' && request.method === 'GET') {
      if (securityEnabled(environment, env)) await requireRole(request, env, ['admin', 'approver']);
      return json({ ok: true, changes: await repo.read(environment, 'pending-changes') });
    }
    if (url.pathname === '/api/clear-history' && request.method === 'POST') {
      await requireRole(request, env, ['approver', 'admin']);
      const changes = await repo.read(environment, 'pending-changes');
      const remaining = changes.filter(change => change.status === 'pending');
      await repo.write(environment, 'pending-changes', remaining);
      return json({ ok: true, deleted: changes.length - remaining.length, remaining: remaining.length });
    }
    if (url.pathname === '/api/clear-pending' && request.method === 'POST') {
      await requireRole(request, env, ['admin']);
      const changes = await repo.read(environment, 'pending-changes');
      const pendingCount = changes.filter(c => c.status === 'pending').length;
      await repo.write(environment, 'pending-changes', []);
      return json({ ok: true, cleared: pendingCount });
    }
    if (url.pathname === '/api/change' && request.method === 'POST') {
      const body = await request.json();
      const reflection = ['sessionFeedback', 'matchFeedback'].includes(body.entityType);
      const actor = securityEnabled(environment, env)
        ? await requireRole(request, env, reflection ? ['site', 'admin', 'approver'] : ['admin'])
        : reflection ? await session(request, env) : null;
      const records = {}; for (const type of publicTypes) records[type] = await repo.read(environment, type);
      const collection = collectionFor(body.entityType); if (!collection) throw new Error('Unsupported entity type');
      if (!['create', 'update', 'delete'].includes(body.action)) throw new Error('Action must be create, update, or delete');
      if (body.action !== 'delete') validateEntity(body.entityType, body.after, { players: records.players, matches: records.matches, tournamentMatches: records['tournament-matches'], tournaments: records.tournaments, externalOpponents: records['external-opponents'], sessions: records.sessions }, body.targetId);
      const idField = idFieldFor(body.entityType);
      const before = records[collection].find(item => item[idField] === body.targetId) || null;
      if (body.entityType === 'importBatch' && body.action !== 'create') throw new Error('Import batch history is immutable');
      if (body.entityType === 'importBatch' && before) throw new Error('This import batch is already approved');
      if (!before && body.action === 'delete') throw new Error('Record not found');
      const mergedAfter = (body.action !== 'delete' && before && body.after) ? { ...before, ...body.after } : body.after;
      const changes = await repo.read(environment, 'pending-changes');
      const existingIndex = changes.findIndex(c => c.status === 'pending' && c.entityType === body.entityType && c.targetId === body.targetId);
      const refBefore = existingIndex >= 0 ? changes[existingIndex].before : before;
      const diff = createDiff(refBefore, mergedAfter);
      if (body.action !== 'create' && body.action !== 'delete' && !diff.length) return json({ ok: true, change: null, message: 'No changes detected' });
      const changedFields = diff.map(d => d.field);
      const summary = buildSummary(body.entityType, mergedAfter || before);
      const batchId = body.batchId && /^[A-Za-z0-9_-]{4,100}$/.test(body.batchId) ? body.batchId : existingIndex >= 0 ? changes[existingIndex].batchId || '' : '';
      const correctionOf = body.correctionOf && /^CHANGE-[A-Za-z0-9_-]+$/.test(body.correctionOf) ? body.correctionOf : existingIndex >= 0 ? changes[existingIndex].correctionOf || '' : '';
      const change = { changeId: existingIndex >= 0 ? changes[existingIndex].changeId : `CHANGE-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, entityType: body.entityType, action: body.action || (before ? 'update' : 'create'), targetId: body.targetId, before: refBefore, after: mergedAfter, diff, changedFields, summary, batchId, correctionOf, createdBy: actor?.role === 'site' ? 'member' : actor?.role || 'admin', createdAt: existingIndex >= 0 ? changes[existingIndex].createdAt : new Date().toISOString(), status: 'pending' };
      const next = [...changes]; if (existingIndex >= 0) next[existingIndex] = change; else next.push(change);
      await repo.write(environment, 'pending-changes', next); return json({ ok: true, change });
    }
    if (url.pathname === '/api/approve' && request.method === 'POST') {
      const body = await request.json();
      if (!['accept', 'reject'].includes(body.decision)) throw new Error('Decision must be accept or reject');
      const actor = securityEnabled(environment, env) || body.decision === 'accept'
        ? await requireRole(request, env, ['approver', 'admin'])
        : null;
      if (body.decision === 'reject') {
        const changes = await repo.read(environment, 'pending-changes');
        const change = changes.find(item => item.changeId === body.changeId && item.status === 'pending');
        if (!change) throw new Error('Pending change not found');
        await repo.write(environment, 'pending-changes', changes.map(item => item.changeId === change.changeId ? { ...item, status: 'rejected', reviewedAt: new Date().toISOString(), reviewedBy: actor?.role || 'submitter' } : item));
        return json({ ok: true });
      }
      return json(await repo.withLock(environment, async () => {
        const changes = await repo.read(environment, 'pending-changes');
        const change = changes.find(item => item.changeId === body.changeId && item.status === 'pending');
        if (!change) throw new Error('Pending change not found');
        const collection = collectionFor(change.entityType);
        const current = await repo.read(environment, collection);
        const idField = idFieldFor(change.entityType);
        if (change.before && JSON.stringify(current.find(item => item[idField] === change.targetId)) !== JSON.stringify(change.before)) throw new Error('Change is stale and must be resubmitted');
        const next = current.filter(item => item[idField] !== change.targetId);
        if (change.action !== 'delete') next.push(change.after);
        await repo.write(environment, collection, next);
        await repo.write(environment, 'pending-changes', changes.map(item => item.changeId === change.changeId ? { ...item, status: 'accepted', reviewedAt: new Date().toISOString(), reviewedBy: actor.role } : item));
        return { ok: true };
      }));
    }
    if (url.pathname === '/api/approve-batch' && request.method === 'POST') {
      const actor = await requireRole(request, env, ['approver', 'admin']);
      const body = await request.json();
      if (!body.batchId || !['accept', 'reject'].includes(body.decision)) throw new Error('A batch ID and valid decision are required');
      return json(await repo.withLock(environment, async () => {
        const changes = await repo.read(environment, 'pending-changes');
        const batch = changes.filter(change => change.status === 'pending' && change.batchId === body.batchId);
        if (!batch.length) throw new Error('Pending batch not found');
        const reviewedAt = new Date().toISOString();
        if (body.decision === 'reject') {
          await repo.write(environment, 'pending-changes', changes.map(change => batch.some(item => item.changeId === change.changeId) ? { ...change, status: 'rejected', reviewedAt, reviewedBy: actor.role } : change));
          return { ok: true, processed: batch.length };
        }
        const importChanges = batch.filter(change => change.entityType === 'importBatch' && change.action === 'create');
        for (const importChange of importChanges) {
          const importRecord = importChange.after;
          const expectedMatchIds = new Set(importRecord.matchIds || []);
          const importedMatches = batch.filter(change => change.entityType === 'match' && change.action === 'create' && change.after?.importBatchId === importRecord.importBatchId);
          if (importedMatches.length !== expectedMatchIds.size || importedMatches.some(change => !expectedMatchIds.has(change.targetId))) throw new Error('Import batch is incomplete and cannot be approved');
          const approvedImports = await repo.read(environment, 'import-batches');
          if (approvedImports.some(item => item.inputHash === importRecord.inputHash || item.importBatchId === importRecord.importBatchId)) throw new Error('This import batch is already approved');
          const approvedSessions = await repo.read(environment, 'sessions');
          const pendingSession = batch.some(change => change.entityType === 'session' && change.targetId === importRecord.sessionId && change.action !== 'delete');
          if (!pendingSession && !approvedSessions.some(item => item.sessionId === importRecord.sessionId && item.sessionDate === importRecord.sessionDate)) throw new Error('Import batch must include or reference its session');
        }
        const collections = new Map();
        for (const change of batch) {
          const collection = collectionFor(change.entityType), idField = idFieldFor(change.entityType);
          if (!collection || !idField) throw new Error(`Unsupported batch entity type: ${change.entityType}`);
          if (!collections.has(collection)) collections.set(collection, await repo.read(environment, collection));
          const current = collections.get(collection), existing = current.find(item => item[idField] === change.targetId);
          if (change.before && JSON.stringify(existing) !== JSON.stringify(change.before)) throw new Error(`Batch contains a stale change: ${change.targetId}`);
          const next = current.filter(item => item[idField] !== change.targetId);
          if (change.action !== 'delete') next.push(change.after);
          collections.set(collection, next);
        }
        for (const [collection, records] of collections) await repo.write(environment, collection, records);
        await repo.write(environment, 'pending-changes', changes.map(change => batch.some(item => item.changeId === change.changeId) ? { ...change, status: 'accepted', reviewedAt, reviewedBy: actor.role } : change));
        return { ok: true, processed: batch.length };
      }));
    }
    if (url.pathname === '/api/bulk-rubbers' && request.method === 'POST') {
      await requireRole(request, env, ['admin']);
      const body = await request.json();
      const { rubbers, environment: envParam } = body;
      if (!Array.isArray(rubbers) || rubbers.length === 0) throw new Error('rubbers array is required');
      const targetEnv = validateEnvironment(envParam || url.searchParams.get('environment') || 'prod');
      await repo.write(targetEnv, 'rubbers', rubbers);
      return json({ ok: true, count: rubbers.length, environment: targetEnv });
    }
    if (url.pathname === '/api/bulk-write' && request.method === 'POST') {
      await requireRole(request, env, ['admin']);
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
  } catch (error) { const status = error.status || (error.message === 'Authentication required' ? 401 : 400); return new Response(JSON.stringify({ ok: false, error: error.message }), { status, headers: JSON_HEADERS }); }
} };
