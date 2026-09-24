#!/usr/bin/env node
/* Read-only preview for the 2026-09-24 training-match transcription. */
const API = 'https://little-kings-api.little-kings.workers.dev/api/public-data?environment=uat';
const source = `
岡田 3-0 ひなちゃん
ケイツ 3-0 ジェイス
加藤3 3-0 李母
ジェイス 3-0 ひなちゃん
坪内 3-1 井関2
福原 3-1 青山
望月 3-1 山本
岡田 3-0 大谷
岡崎 3-1 向井
山本 2-0 ひなちゃん
加藤3 3-0 ジェイス
栗原 3-0 青山
李母 3-2 ケイツ
井関2 3-0 石塚
岡田 3-0 諏訪光
加藤2 3-1 土屋
繁田 3-1 坪内
繁田 3-0 井関2
加藤3 3-0 福原
岡崎 3-1 笹岡
望月 3-1 大谷
向井 3-1 青山
ジェイス 3-0 下田
李母 3-0 繁田
西田 3-0 ひなちゃん
三田村 3-0 岡田
山本 3-2 坪内父
岡崎 3-0 栗原
土屋 3-1 井関2
望月 3-0 ケイツ
李母 3-0 ジェイス
佐藤 3-1 大谷
ケイツ 3-0 繁田
下田 3-2 井関2
岡田 3-0 笹岡
石塚 3-1 坪内父
土屋 3-2 加藤3
岡崎 3-0 加藤2
坪内 3-0 ひなちゃん
山本 3-0 西田
岡田 3-0 佐藤
李母 3-0 下田
栗原 3-2 井関2
向井 3-2 大谷
土屋 3-0 福原
坪内父 3-0 望月
岡崎 3-0 ジェイス
諏訪光 3-2 青山
石塚 3-1 加藤3
向井 3-0 繁田
西田 3-0 井関2
山本 3-1 李母
栗原 3-1 土屋
岡崎 2-0 井関2
笹岡 3-0 青山
ジェイス 3-0 繁田
大谷 3-2 ケイツ
下田 3-0 西田
井関2 3-0 ひなちゃん
坪内父 3-1 諏訪光
大谷 3-0 石塚
向井 3-0 土屋
笹岡 2-1 井関2
望月 3-2 福原
岡崎 2-1 加藤3`;

const matches = source.trim().split('\n').map((line, index) => {
  const parsed = line.trim().match(/^(.+?)\s+(\d+)-(\d+)\s+(.+)$/);
  if (!parsed) throw new Error(`Invalid row ${index + 1}: ${line}`);
  return { row: index + 1, winnerAlias: parsed[1], winnerSets: Number(parsed[2]), loserSets: Number(parsed[3]), loserAlias: parsed[4] };
});
const normalize = value => String(value || '').replace(/[\s()（）・.]/g, '').toLowerCase();

(async () => {
  const data = await fetch(API, { headers: { 'User-Agent': 'Little-Kings-Transcription-Preview/1.0' } }).then(response => response.json());
  const people = [...(data.players || []), ...(data.externalOpponents || [])];
  const aliases = [...new Set(matches.flatMap(match => [match.winnerAlias, match.loserAlias]))];
  console.log(`Matches: ${matches.length}; unique source names: ${aliases.length}`);
  for (const alias of aliases) {
    const key = normalize(alias);
    const exact = people.filter(person => [person.displayName, person.notebookName, person.englishName].some(value => normalize(value) === key));
    const partial = !exact.length ? people.filter(person => [person.displayName, person.notebookName, person.englishName].some(value => normalize(value).includes(key) || key.includes(normalize(value)))).slice(0, 8) : [];
    const candidates = [...exact, ...partial].map(person => `${person.playerId || person.externalOpponentId}:${person.displayName}${person.notebookName ? ` [${person.notebookName}]` : ''}`).join(' | ');
    console.log(`${alias}\t${candidates || 'UNRESOLVED'}`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
