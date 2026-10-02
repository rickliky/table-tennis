window.LK_PROFILE_IMAGES = new Set([
  'LK-0003', 'LK-0005', 'LK-0006', 'LK-0009', 'LK-0015', 'LK-0016',
  'LK-0018', 'LK-0032', 'LK-0053', 'LK-0062', 'LK-0064', 'LK-0065',
  'LK-0079', 'LK-0080', 'LK-0081', 'LK-0084', 'LK-0085', 'LK-0086',
  'LK-0087', 'LK-0088', 'LK-0089', 'LK-0090', 'LK-0092', 'LK-0152'
]);
window.lkProfileImage = playerId => window.LK_PROFILE_IMAGES.has(playerId)
  ? `img/${encodeURIComponent(playerId)}.jpg`
  : 'img/NoProfilePic.jpg';
