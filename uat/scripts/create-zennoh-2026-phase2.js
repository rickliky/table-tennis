#!/usr/bin/env node
/* Create all 47 listed 2026 全農杯 results after phase 1 is approved. */
const API = 'https://little-kings-api.little-kings.workers.dev';
const environment = process.argv[2] || 'uat';
const tournamentId = 'TOURNAMENT-0001';

// [division, player ID, printed name, rank (null = 推薦), recommended, qualified]
const entries = [
  ['ホープス男子','EXT-0001','茂田翔紀',1,false,true], ['ホープス男子','EXT-0002','神保和悠',2,false,true], ['ホープス男子','EXT-0003','下田旺典',3,false,true], ['ホープス男子','LK-0046','加藤史也',4,false,true], ['ホープス男子','EXT-0004','三浦健人',5,false,false], ['ホープス男子','EXT-0005','森本陽喜',5,false,false], ['ホープス男子','EXT-0006','蒋修逸',7,false,false], ['ホープス男子','EXT-0007','山下駿',7,false,false],
  ['ホープス女子','EXT-0008','鈴木希華',null,true,true], ['ホープス女子','EXT-0009','新井想来',1,false,true], ['ホープス女子','EXT-0010','鈴木愛梨',2,false,true], ['ホープス女子','EXT-0011','佐々木真心',3,false,true], ['ホープス女子','EXT-0012','森本潤',4,false,true], ['ホープス女子','EXT-0013','下田さくら',5,false,true], ['ホープス女子','LK-0002','李紫妤',6,false,false], ['ホープス女子','EXT-0015','大宮心花',7,false,false], ['ホープス女子','EXT-0016','北川結愛',8,false,false],
  ['カブ男子','EXT-0017','茂田悠稀',null,true,true], ['カブ男子','EXT-0018','倉田東弥',1,false,true], ['カブ男子','EXT-0019','吉野明琳',2,false,true], ['カブ男子','EXT-0020','今牧晴大',3,false,true], ['カブ男子','EXT-0021','金丸楓',4,false,true], ['カブ男子','EXT-0022','酬醐宙',5,false,false], ['カブ男子','EXT-0023','下田陽太',6,false,false], ['カブ男子','EXT-0024','渡邉栄介',7,false,false], ['カブ男子','EXT-0025','宮下璃多',8,false,false],
  ['カブ女子','EXT-0026','森本夏愛',null,true,true], ['カブ女子','EXT-0027','村守夏帆',1,false,true], ['カブ女子','EXT-0028','伊藤楓香',2,false,true], ['カブ女子','EXT-0029','鈴木梨楓',3,false,true], ['カブ女子','EXT-0030','石川楓',4,false,true], ['カブ女子','EXT-0031','高宮歌乃',5,false,false], ['カブ女子','EXT-0032','田村舞桜',6,false,false], ['カブ女子','EXT-0033','鈴木伶奈',7,false,false], ['カブ女子','LK-0003','下田結愛',8,false,false],
  ['バンビ男子','EXT-0034','張本翔',1,false,true], ['バンビ男子','EXT-0035','坂場郁斗',2,false,true], ['バンビ男子','EXT-0036','吉野琉太',3,false,true], ['バンビ男子','EXT-0037','吉村来夢',4,false,true], ['バンビ男子','EXT-0038','出雲悠真',5,false,false], ['バンビ男子','EXT-0039','村庄凑仁',6,false,false],
  ['バンビ女子','EXT-0040','板野夏音',1,false,true], ['バンビ女子','EXT-0041','内田結衣',2,false,true], ['バンビ女子','EXT-0042','中間琴海',3,false,true], ['バンビ女子','EXT-0043','伊藤心香',4,false,true], ['バンビ女子','EXT-0044','倉田和歌',5,false,false], ['バンビ女子','EXT-0045','浅野あさき',6,false,false],
];

async function main() {
  for (let index = 0; index < entries.length; index++) {
    const [division, playerId, playerName, rank, recommended, qualified] = entries[index];
    const tournamentProgressId = `TP-${String(index + 1).padStart(4, '0')}`;
    const response = await fetch(`${API}/api/change?environment=${environment}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType: 'tournamentProgress', targetId: tournamentProgressId, action: 'create', after: { tournamentProgressId, tournamentId, division, playerId, playerName, rank, recommended, qualified } }),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(`${tournamentProgressId}: ${json.error || response.status}`);
    console.log(`✓ ${tournamentProgressId} ${playerName}`);
  }
  console.log(`Submitted ${entries.length} results: ${entries.filter(entry => entry[5]).length} representatives.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
