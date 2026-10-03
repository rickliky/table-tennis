const lookupTables = new Set(['gender', 'category', 'playingHand', 'grip', 'playingStyle', 'rubberType', 'playerStatus', 'matchFormat', 'matchStatus', 'tournamentWinner']);

export function validateEntity(entityType, record, data, targetId = record?.[({ club: 'clubId', player: 'playerId', match: 'matchId', externalOpponent: 'externalOpponentId', tournament: 'tournamentId', tournamentMatch: 'tournamentMatchId', tournamentProgress: 'tournamentProgressId', rubber: 'rubberId', sessionFeedback: 'feedbackId', matchFeedback: 'matchFeedbackId', session: 'sessionId' }[entityType])]) {
  if (!record || typeof record !== 'object') throw new Error('Record is required');
  const idField = { club: 'clubId', player: 'playerId', match: 'matchId', externalOpponent: 'externalOpponentId', tournament: 'tournamentId', tournamentMatch: 'tournamentMatchId', tournamentProgress: 'tournamentProgressId', rubber: 'rubberId', sessionFeedback: 'feedbackId', matchFeedback: 'matchFeedbackId', session: 'sessionId' }[entityType];
  if (!idField || !record[idField]) throw new Error('A valid record ID is required');
  if (record[idField] !== targetId) throw new Error('Target ID does not match record ID');
  const participantExists = id => data.players.some(item => item.playerId === id) || data.externalOpponents.some(item => item.externalOpponentId === id);
  const validSetCounts = values => values.every(value => Number.isInteger(Number(value)) && Number(value) >= 0);
  if (entityType === 'match') {
    if (!record.player1Id || !record.player2Id || record.player1Id === record.player2Id) throw new Error('A match requires two different players');
    if (!validSetCounts([record.player1Sets, record.player2Sets])) throw new Error('Set counts must be non-negative integers');
    if (!participantExists(record.player1Id) || !participantExists(record.player2Id)) throw new Error('Match players must exist');
    if (record.sessionId && !/^[A-Za-z0-9_-]{4,64}$/.test(record.sessionId)) throw new Error('Session ID may contain only letters, numbers, underscores, and hyphens');
    const linkedSession = (data.sessions || []).find(item => item.sessionId === record.sessionId);
    if (linkedSession && linkedSession.sessionDate !== record.matchDate) throw new Error('Match date must match the linked session date');
    if (record.matchFormat && !['Best of 5', 'Best of 3', 'Short practice'].includes(record.matchFormat)) throw new Error('Unsupported match format');
    if (record.verifiedAt && !/^\d{4}-\d{2}-\d{2}$/.test(record.verifiedAt)) throw new Error('Verified date must use YYYY-MM-DD');
    for (const field of ['source', 'coachGoal', 'coachNote']) if (record[field] && String(record[field]).length > 500) throw new Error(`${field} must be 500 characters or fewer`);
  }
  if (entityType === 'session') {
    if (!/^[A-Za-z0-9_-]{4,64}$/.test(record.sessionId)) throw new Error('Session ID may contain only letters, numbers, underscores, and hyphens');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.sessionDate || '')) throw new Error('Session date must use YYYY-MM-DD');
    if (!['Club Training', 'Open Practice', 'Private Lesson', 'Other'].includes(record.sessionType)) throw new Error('Unsupported session type');
    if (record.matchFormat && !['Best of 5', 'Best of 3', 'Short practice', 'Mixed'].includes(record.matchFormat)) throw new Error('Unsupported session match format');
    if (record.verifiedAt && !/^\d{4}-\d{2}-\d{2}$/.test(record.verifiedAt)) throw new Error('Verified date must use YYYY-MM-DD');
    for (const field of ['venue', 'source', 'coachGoal']) if (record[field] && String(record[field]).length > 500) throw new Error(`${field} must be 500 characters or fewer`);
    if (record.coachNote && String(record.coachNote).length > 1500) throw new Error('coachNote must be 1500 characters or fewer');
  }
  if (entityType === 'tournamentMatch') {
    if (!record.tournamentId || !data.tournaments.some(item => item.tournamentId === record.tournamentId)) throw new Error('Tournament match must reference an existing tournament');
    if (!record.player1Id || !record.player2Id || record.player1Id === record.player2Id || !participantExists(record.player1Id) || !participantExists(record.player2Id)) throw new Error('Tournament match requires two different existing players');
    if (!validSetCounts([record.player1Sets, record.player2Sets])) throw new Error('Set counts must be non-negative integers');
  }
  if (entityType === 'tournamentProgress') {
    if (!record.tournamentId || !data.tournaments.some(item => item.tournamentId === record.tournamentId)) throw new Error('Tournament progress must reference an existing tournament');
    if (!record.playerId || !participantExists(record.playerId)) throw new Error('Tournament progress must reference an existing player');
  }
  if (entityType === 'sessionFeedback') {
    const player = data.players.find(item => item.playerId === record.playerId);
    if (!player) throw new Error('Feedback must reference an existing Little Kings player');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.sessionDate || '')) throw new Error('Feedback date must use YYYY-MM-DD');
    if (record.feedbackId !== `FB-${record.sessionDate.replace(/-/g, '')}-${record.playerId}`) throw new Error('Invalid feedback ID');
    if (record.sessionId !== `LKS-${record.sessionDate.replace(/-/g, '')}`) throw new Error('Feedback session ID must match its date');
    if (!(data.matches || []).some(match => match.matchDate === record.sessionDate && /club|training|練習/i.test(`${match.event || ''} ${match.division || ''}`))) throw new Error('Feedback must reference a recorded training date');
    if (record.playerName !== player.displayName) throw new Error('Feedback player name must match the selected player');
    if (record.visibility !== 'members') throw new Error('Feedback visibility must be members');
    for (const field of ['effort', 'confidence']) if (!Number.isInteger(Number(record[field])) || Number(record[field]) < 1 || Number(record[field]) > 5) throw new Error(`${field} must be an integer from 1 to 5`);
    for (const field of ['wentWell', 'nextFocus']) if (!String(record[field] || '').trim() || String(record[field]).length > 500) throw new Error(`${field} is required and must be 500 characters or fewer`);
    if (record.note && String(record.note).length > 1000) throw new Error('note must be 1000 characters or fewer');
  }
  if (entityType === 'matchFeedback') {
    const player = data.players.find(item => item.playerId === record.playerId);
    if (!player) throw new Error('Match reflection must reference an existing Little Kings player');
    if (!['training', 'tournament'].includes(record.matchType)) throw new Error('Match reflection type must be training or tournament');
    const source = record.matchType === 'training' ? data.matches || [] : data.tournamentMatches || [];
    const idField = record.matchType === 'training' ? 'matchId' : 'tournamentMatchId';
    const match = source.find(item => item[idField] === record.matchId);
    if (!match) throw new Error('Match reflection must reference an existing match');
    if (match.player1Id !== record.playerId && match.player2Id !== record.playerId) throw new Error('The selected player did not participate in this match');
    const opponentId = match.player1Id === record.playerId ? match.player2Id : match.player1Id;
    const opponentRecord = data.players.find(item => item.playerId === opponentId) || data.externalOpponents.find(item => item.externalOpponentId === opponentId);
    const opponentName = (match.player1Id === record.playerId ? match.player2Name : match.player1Name) || opponentRecord?.displayName || opponentId;
    const ownSets = Number(match.player1Id === record.playerId ? match.player1Sets : match.player2Sets);
    const opponentSets = Number(match.player1Id === record.playerId ? match.player2Sets : match.player1Sets);
    const result = match.winnerId ? (match.winnerId === record.playerId ? 'win' : 'loss') : 'incomplete';
    const expectedId = `MRF-${record.matchType === 'training' ? 'T' : 'O'}-${record.matchId}-${record.playerId}`;
    if (record.matchFeedbackId !== expectedId) throw new Error('Invalid match reflection ID');
    if (record.playerName !== player.displayName || record.opponentId !== opponentId || record.opponentName !== opponentName) throw new Error('Match reflection participant snapshots do not match the selected match');
    if (record.matchDate !== match.matchDate || record.score !== `${ownSets}-${opponentSets}` || record.result !== result) throw new Error('Match reflection result snapshot does not match the selected match');
    if (record.visibility !== 'members') throw new Error('Match reflection visibility must be members');
    for (const field of ['whatWorked', 'challenge', 'nextPlan']) if (!String(record[field] || '').trim() || String(record[field]).length > 500) throw new Error(`${field} is required and must be 500 characters or fewer`);
    if (record.adjustment && String(record.adjustment).length > 500) throw new Error('adjustment must be 500 characters or fewer');
  }
  return record;
}

export function validateEnvironment(value) {
  if (value !== 'uat' && value !== 'prod') throw new Error('Invalid environment');
  return value;
}

export { lookupTables };
