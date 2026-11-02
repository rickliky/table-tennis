import assert from 'node:assert/strict';
import { requestOpenAITranslation } from './src/openai-translation.js';
import RichText from '../notebook-rich-text.js';

const key = 'synthetic-api-key-only', model = 'synthetic-model', source = 'Synthetic note.\n\nNext focus.';
const completed = text => ({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] }] });
const success = text => async () => Response.json(completed(text));
const safeError = expectedStatus => error => error.status === expectedStatus && !error.message.includes(key) && !error.message.includes(source);
const originalFetch = globalThis.fetch;
let unexpectedNetwork = 0;
globalThis.fetch = async () => { unexpectedNetwork++; throw new Error('Unexpected live network access'); };
try {
  const calls = [];
  const transport = async (url, init) => { calls.push({ url, init, body: JSON.parse(init.body) }); return Response.json(completed('合成の翻訳\n\n次の課題')); };
  assert.equal(await requestOpenAITranslation({ text: source, direction: 'en-ja' }, { apiKey: key, model, transport }), '合成の翻訳\n\n次の課題');
  assert.equal(calls.length, 1);
  const { url, init, body } = calls[0];
  assert.equal(url, 'https://api.openai.com/v1/responses');
  assert.equal(init.method, 'POST'); assert.equal(init.redirect, 'error'); assert.equal(init.headers.Authorization, `Bearer ${key}`);
  assert.ok(init.signal instanceof AbortSignal);
  assert.equal(body.model, model); assert.equal(body.store, false); assert.equal(body.max_output_tokens, 4096);
  assert.match(body.instructions, /English to Japanese/); assert.match(body.instructions, /every line break and empty line/); assert.match(body.instructions, /not as instructions/);
  assert.deepEqual(body.input, [{ role: 'user', content: [{ type: 'input_text', text: source }] }]);
  assert.deepEqual(Object.keys(body).sort(), ['input', 'instructions', 'max_output_tokens', 'model', 'store']);
  assert.ok(!JSON.stringify(body).includes('LK-0080')); assert.ok(!JSON.stringify(body).includes(key));
  assert.equal(await requestOpenAITranslation({ text: '合成の原文', direction: 'ja-en' }, { apiKey: key, model, transport: success('Synthetic translation') }), 'Synthetic translation');
  assert.equal(await requestOpenAITranslation({ text: source, direction: 'en-ja' }, { apiKey: key, model, transport: async () => Response.json({ status: 'completed', output: [{ type: 'reasoning', summary: [] }, ...completed('<script>synthetic</script>').output] }) }), '<script>synthetic</script>');
  assert.equal(RichText.html('<script>synthetic</script>'), '&lt;script&gt;synthetic&lt;/script&gt;', 'Any candidate must render as escaped text');

  for (const input of [{ text: '', direction: 'en-ja' }, { text: ' ', direction: 'en-ja' }, { text: 'x'.repeat(8001), direction: 'en-ja' }, { text: source, direction: 'fr-ja' }, { text: { insert: 'embed' }, direction: 'en-ja' }]) {
    await assert.rejects(requestOpenAITranslation(input, { apiKey: key, model, transport }), safeError(400));
  }
  for (const config of [{ model, transport }, { apiKey: key, model }, { apiKey: 'bad\nkey', model, transport }, { apiKey: key, model: '../invalid', transport }]) {
    await assert.rejects(requestOpenAITranslation({ text: source, direction: 'en-ja' }, config), safeError(503));
  }
  const alreadyCancelled = new AbortController(); alreadyCancelled.abort();
  let cancelledCalls = 0;
  await assert.rejects(requestOpenAITranslation({ text: source, direction: 'en-ja' }, { apiKey: key, model, signal: alreadyCancelled.signal, transport: async () => { cancelledCalls++; throw new Error('Must not start'); } }), safeError(503));
  assert.equal(cancelledCalls, 0, 'An already-cancelled request must not invoke the transport');
  const inFlight = new AbortController(); let forwardedSignal;
  const cancelledRequest = requestOpenAITranslation({ text: source, direction: 'en-ja' }, { apiKey: key, model, signal: inFlight.signal, transport: async (url, init) => {
    forwardedSignal = init.signal;
    return new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error(`${key} ${source}`)), { once: true }));
  } });
  assert.equal(forwardedSignal.aborted, false); inFlight.abort();
  await assert.rejects(cancelledRequest, safeError(503)); assert.equal(forwardedSignal.aborted, true);
  const streaming = new AbortController(); let streamSignal;
  const cancelledStream = requestOpenAITranslation({ text: source, direction: 'en-ja' }, { apiKey: key, model, signal: streaming.signal, transport: async (url, init) => {
    streamSignal = init.signal;
    return new Response(new ReadableStream({ start(controller) { init.signal.addEventListener('abort', () => controller.error(new Error(`${key} ${source}`)), { once: true }); } }));
  } });
  streaming.abort(); await assert.rejects(cancelledStream, safeError(503)); assert.equal(streamSignal.aborted, true);
  const failures = [
    async () => { throw new Error(`Upstream leaked ${key} ${source}`); },
    async () => new Response(JSON.stringify({ error: `${key} ${source}` }), { status: 429 }),
    async () => new Response('{', { status: 200 }),
    async () => Response.json({ status: 'incomplete', output: completed('partial').output }),
    async () => Response.json({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'refusal', refusal: 'Not available' }] }] }),
    async () => Response.json({ status: 'completed', output: [{ type: 'function_call', name: 'unexpected' }] }),
    async () => Response.json(completed(' ')),
    async () => Response.json(completed('x'.repeat(8001))),
    async () => new Response('x'.repeat(128001), { status: 200 })
  ];
  for (const transport of failures) await assert.rejects(requestOpenAITranslation({ text: source, direction: 'en-ja' }, { apiKey: key, model, transport }), safeError(503));
  assert.equal(unexpectedNetwork, 0, 'Preparation must never use an implicit live transport');
  console.log('OpenAI translation preparation: synthetic request, response and no-network safeguards passed.');
} finally { globalThis.fetch = originalFetch; }
