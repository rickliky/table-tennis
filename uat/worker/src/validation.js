const lookupTables = new Set(['gender', 'category', 'playingHand', 'grip', 'playingStyle', 'rubberType', 'playerStatus', 'matchFormat', 'matchStatus', 'tournamentWinner']);

export function validateEntity(entityType, record, data, targetId = record?.[({ club: 'clubId', player: 'playerId', match: 'matchId', externalOpponent: 'externalOpponentId', tournament: 'tournamentId', tournamentMatch: 'tournamentMatchId', tournamentProgress: 'tournamentProgressId', rubber: 'rubberId' }[entityType])]) {
  if (!record || typeof record !== 'object') throw new Error('Record is required');
  const idField = { club: 'clubId', player: 'playerId', match: 'matchId', externalOpponent: 'externalOpponentId', tournament: 'tournamentId', tournamentMatch: 'tournamentMatchId', tournamentProgress: 'tournamentProgressId', rubber: 'rubberId' }[entityType];
  if (!idField || !record[idField]) throw new Error('A valid record ID is required');
  if (record[idField] !== targetId) throw new Error('Target ID does not match record ID');
  const participantExists = id => data.players.some(item => item.playerId === id) || data.externalOpponents.some(item => item.externalOpponentId === id);
  const validSetCounts = values => values.every(value => Number.isInteger(Number(value)) && Number(value) >= 0);
  if (entityType === 'match') {
    if (!record.player1Id || !record.player2Id || record.player1Id === record.player2Id) throw new Error('A match requires two different players');
    if (!validSetCounts([record.player1Sets, record.player2Sets])) throw new Error('Set counts must be non-negative integers');
    if (!participantExists(record.player1Id) || !participantExists(record.player2Id)) throw new Error('Match players must exist');
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
  return record;
}

export function validateEnvironment(value) {
  if (value !== 'uat' && value !== 'prod') throw new Error('Invalid environment');
  return value;
}

export { lookupTables };
