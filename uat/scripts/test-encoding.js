/* Test Upstash UTF-8 encoding */
const url = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) { console.error('Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN'); process.exit(1); }

const headers = { Authorization: `Bearer ${token}` };
const testKey = 'uat:encoding-test';
const testValue = '三田村';

(async () => {
  // Write with explicit Content-Type: text/plain; charset=utf-8
  console.log('Storing:', testValue);
  const setRes = await fetch(`${url}/set/${encodeURIComponent(testKey)}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
    body: testValue
  });
  console.log('Set status:', setRes.status, await setRes.json());

  // Read back
  const getRes = await fetch(`${url}/get/${encodeURIComponent(testKey)}`, { headers });
  const getResult = await getRes.json();
  console.log('Get result:', getResult);
  console.log('Decoded:', getResult.result);
  console.log('Match:', getResult.result === testValue);

  // Also test with JSON body (like the push script does)
  const jsonTestKey = 'uat:encoding-test-json';
  const jsonArray = [{ playerId: 'LK-TEST', displayName: '三田村', englishName: 'Test' }];
  const jsonBody = JSON.stringify(jsonArray);
  console.log('\nStoring JSON array:', jsonBody);
  const setRes2 = await fetch(`${url}/set/${encodeURIComponent(jsonTestKey)}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
    body: jsonBody
  });
  console.log('Set status:', setRes2.status, await setRes2.json());

  const getRes2 = await fetch(`${url}/get/${encodeURIComponent(jsonTestKey)}`, { headers });
  const getResult2 = await getRes2.json();
  console.log('Get result:', getResult2);
  const parsed = JSON.parse(getResult2.result);
  console.log('Parsed displayName:', parsed[0].displayName);
  console.log('Match:', parsed[0].displayName === '三田村');

  // Cleanup
  await fetch(`${url}/del/${encodeURIComponent(testKey)}`, { method: 'POST', headers });
  await fetch(`${url}/del/${encodeURIComponent(jsonTestKey)}`, { method: 'POST', headers });
  console.log('\nCleaned up test keys.');
})();
