(() => {
  'use strict';

  const tables = {
    gender: [
      ['Male', '男性', 'Male'], ['Female', '女性', 'Female'], ['Other', 'その他', 'Other']
    ],
    category: [
      ['小学生', '小学生', 'Elementary School'], ['中学生', '中学生', 'Junior High School'],
      ['高校生', '高校生', 'High School'], ['一般', '一般', 'Adult'], ['未設定', '未設定', 'Unassigned']
    ],
    playingHand: [['右', '右', 'Right'], ['左', '左', 'Left']],
    grip: [['シェークハンド / Shakehand', 'シェークハンド', 'Shakehand'], ['ペンホルダー / Penhold', 'ペンホルダー', 'Penhold']],
    playingStyle: [['ドライブ攻撃型 / Topspin attacker', 'ドライブ攻撃型', 'Topspin attacker']],
    rubberType: [['INVERTED', '裏ソフト / Inverted', 'Inverted'], ['SHORT_PIPS', '表ソフト / Short pips', 'Short pips'], ['LONG_PIPS', '粒高 / Long pips', 'Long pips'], ['ANTI', 'アンチ / Anti', 'Anti']],
    playerStatus: [['Active', '有効', 'Active'], ['Inactive', '無効', 'Inactive']],
    matchFormat: [['Singles', 'シングルス', 'Singles'], ['Doubles', 'ダブルス', 'Doubles']],
    matchStatus: [['Completed', '完了', 'Completed'], ['Incomplete', '未完了', 'Incomplete'], ['Void', '無効', 'Void'], ['Transcribed - review', '要確認', 'Transcribed - review']],
    tournamentWinner: [['lk', 'リトルキングス', 'Little Kings'], ['external', '相手選手', 'External opponent'], ['unknown', '未定', 'Unknown']]
  };

  const records = Object.fromEntries(Object.entries(tables).map(([table, values]) => [table, Object.fromEntries(values.map(([id, ja, en], sortOrder) => [id, { id, ja, en, sortOrder }]))]));
  const get = (table, id) => records[table]?.[id];
  const label = (table, id, language = localStorage.getItem('lk-language') || 'ja') => get(table, id)?.[language] || id || (language === 'ja' ? '未設定' : 'Unassigned');
  const options = (table, language = localStorage.getItem('lk-language') || 'ja') => Object.values(records[table] || {}).map(item => ({ value: item.id, label: item[language] }));

  window.LKLookups = Object.freeze({ tables: records, get, label, options });
})();
