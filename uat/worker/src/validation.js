const lookupTables = new Set(['gender', 'category', 'playingHand', 'grip', 'playingStyle', 'rubberType', 'playerStatus', 'matchFormat', 'matchStatus', 'tournamentWinner']);

export function validateEntity(entityType, record, data, targetId = record?.[({ club: 'clubId', player: 'playerId', match: 'matchId', externalOpponent: 'externalOpponentId', tournament: 'tournamentId', tournamentMatch: 'tournamentMatchId' }[entityType])]) {
  if (!record || typeof record !== 'object') throw new Error('Record is required');
  const idField = { club: 'clubId', player: 'playerId', match: 'matchId', externalOpponent: 'externalOpponentId', tournament: 'tournamentId', tournamentMatch: 'tournamentMatchId' }[entityType];
  if (!idField || !record[idField]) throw new Error('A valid record ID is required');
  if (record[idField] !== targetId) throw new Error('Target ID does not match record ID');
  if (entityType === 'match') {
    if (!record.player1Id || !record.player2Id || record.player1Id === record.player2Id) throw new Error('A match requires two different players');
    if (![record.player1Sets, record.player2Sets].every(value => Number.isInteger(Number(value)) && Number(value) >= 0)) throw new Error('Set counts must be non-negative integers');
    if (!data.players.some(item => item.playerId === record.player1Id) || !data.players.some(item => item.playerId === record.player2Id)) throw new Error('Match players must exist');
  }
  if (entityType === 'tournamentMatch' && (!data.tournaments.some(item => item.tournamentId === record.tournamentId) || !data.players.some(item => item.playerId === record.lkPlayerId) || !data.externalOpponents.some(item => item.externalOpponentId === record.externalOpponentId))) throw new Error('Tournament match references an unknown record');
  return record;
}

export function validateEnvironment(value) {
  if (value !== 'uat' && value !== 'prod') throw new Error('Invalid environment');
  return value;
}

export { lookupTables };
