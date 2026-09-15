window.categoryDistribution = (() => {
  const colors = {
    '小学生':'#d6a516', 'Elementary School':'#d6a516',
    '中学生':'#54b8d1', 'Junior High School':'#54b8d1',
    '高校生':'#f6f0e2', 'High School':'#f6f0e2',
    '一般':'#8c423a', 'Adult':'#8c423a',
    '未設定':'#6e6a62', 'Unassigned':'#6e6a62'
  };
  const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
  return { color: category => colors[category] || '#a5a198', escape };
})();
