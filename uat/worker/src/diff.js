export function createDiff(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  return [...keys].filter(key => key === 'gradeHistory' || JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])).map(field => ({ field, before: before?.[field] ?? '', after: after?.[field] ?? '' }));
}
