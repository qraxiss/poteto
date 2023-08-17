import { chdir } from 'node:process';
import { fileURLToPath } from 'node:url';
import poteto from '../index.mjs?prefix=test';
import assert from 'node:assert';
import test from 'node:test';

chdir(fileURLToPath(new URL('../testdir/sequence/', import.meta.url)));

let _i = 0;
const bodygen = async function*(n = 10, pause = 9) {
  while (n--) {
    yield `${_i++}`;
    await new Promise(_ => setTimeout(_, pause));
  }
}

const validate = (actual, expected = {}, headers = {}) => {
  assert.ok(actual instanceof Response, `${actual} is not Response`);

  const ago = new Date() - new Date(actual.headers.get('Date'));
  assert.ok(ago >= 0, `got Date ${ago} ms in future`);
  assert.ok(ago <= 9999, `got Date ${ago} ms ago`);

  assert.strictEqual(actual.headers.get('Server'), 'poteto');

  Object.entries(expected).forEach(([key, value]) =>
    assert.strictEqual(actual[key], value)
  );

   Object.entries(headers).forEach(([key, value]) =>
    assert.strictEqual(actual.headers.get(key), value)
  );
}

const filename = `deleteme-${Math.random()}`;
const relativeURL = `./${filename}`;
const absoluteURL = new URL(`../testdir/sequence/${relativeURL}`, import.meta.url);
const href = absoluteURL.href;

const _ = ($ = filename) => [
  filename => filename,
  filename => `./${filename}`,
  filename => new URL(`../testdir/sequence/./${filename}`, import.meta.url),
  filename => new URL(`../testdir/sequence/./${filename}`, import.meta.url).href,
][Math.floor(Math.random() * 4)]($);

test('sequence', async t => {
  let resp;
  let text;
  let json;
  let body;

  resp = await poteto('', { method: 'LIST' });
  validate(resp, { status: 200 }, { 'content-type': 'application/json' });
  json = await resp.json();
  assert.ok(!json.includes(filename));

  resp = await poteto(_());
  validate(resp, { status: 404 }, { 'x-test-code': 'ENOENT' });

  resp = await poteto(_(), { method: 'HEAD' });
  validate(resp, { status: 404 }, { 'x-test-code': 'ENOENT' });
  body = resp.body;
  assert.strictEqual(body, null);
  text = await resp.text();
  assert.strictEqual(text, '');

  resp = await poteto(_(), { method: 'DELETE' });
  validate(resp, { status: 404 }, { 'x-test-code': 'ENOENT' });

  resp = await poteto(_(), { method: 'DELETE', headers: { 'Accept': 'application/json' } });
  validate(resp, { status: 404 }, { 'x-test-code': 'ENOENT' });
  json = await resp.json();
  assert.strictEqual(json.code, 'ENOENT');

  resp = await poteto(_(), { body: 'test', method: 'PUT' });
  validate(resp, { status: 201 });

  assert.rejects(
    poteto(_(), { integrity: 'sha512-qUqP5cyxm6YcTAhz05Hph5gvu9M=' }),
    TypeError,
  );

  resp = await poteto(_(), { integrity: 'sha1-qUqP5cyxm6YcTAhz05Hph5gvu9M=' });
  validate(resp, { status: 200 }, { 'x-test-size': '4' });
  text = await resp.text();
  assert.strictEqual(text, 'test');

  resp = await poteto(_(), { body: bodygen(), method: 'PUT', duplex: 'half' });
  validate(resp, { status: 201 });

  resp = await poteto(_(), { integrity: 'sha384-kK5THyTkhpeQSk0ChvNUxQo1DrtsK578si9xyWzq7/wRxglenKDfDsML9oXc8uXl' });
  validate(resp, { status: 200 }, { 'x-test-size': '10' });
  text = await resp.text();
  assert.strictEqual(text, '0123456789');

  resp = await poteto(_(), { method: 'DELETE' });
  validate(resp, { status: 204 });

  resp = await poteto(_(), { body: 'test', method: 'WRITE' });
  validate(resp, { status: 201 });

  resp = await poteto(_(), { method: 'WRITE' });
  validate(resp, { status: 422 });

  resp = await poteto(_(), { integrity: 'sha512-7iaw3Ur350mqGo7jwQrpkj9hiYB3Lkc/iBml1JQODbJ6wYX4oOHV+E+IvIh/1nsUNzLDBMxfqa2Ob1f1ACio/w==' });
  validate(resp, { status: 200 }, { 'x-test-size': '4' });
  text = await resp.text();
  assert.strictEqual(text, 'test');

  resp = await poteto(_(), { body: bodygen(), method: 'WRITE', duplex: 'half' });
  validate(resp, { status: 201 });

  resp = await poteto(`${_()}${'a'.repeat(2 ** 16)}`, { headers: { 'Accept': 'application/json' } });
  validate(resp, { status: 400 }, { 'x-test-code': 'ENAMETOOLONG' });
  json = await resp.json();
  assert.strictEqual(json.code, 'ENAMETOOLONG');

  resp = await poteto(_(), { integrity: 'sha256-uvThdKYK8fCnhkKy2981+29g4O/6OEoSLNsi/VXPIWU=' });
  validate(resp, { status: 200 }, { 'x-test-size': '20' });
  text = await resp.text();
  assert.strictEqual(text, '10111213141516171819');

  resp = await poteto(_(), { body: 'test', method: 'PUT' });
  validate(resp, { status: 201 });

  resp = await poteto(_(), { method: 'PUT' });
  validate(resp, { status: 422 });

  resp = await poteto(_(), { method: 'READ' });
  validate(resp, { status: 200 }, { 'x-test-size': '4' });
  text = await resp.text();
  assert.strictEqual(text, 'test');

  resp = await poteto(_(), { body: bodygen(), method: 'WRITE', duplex: 'half' });
  validate(resp, { status: 201 });

  resp = await poteto(_(), { method: 'READ' });
  validate(resp, { status: 200 }, { 'x-test-size': '20' });
  text = await resp.text();
  assert.strictEqual(text, '20212223242526272829');

  resp = await poteto(_(), { body: bodygen(), method: 'APPEND', duplex: 'half' });
  validate(resp, { status: 201 });

  resp = await poteto(_(), { method: 'APPEND', duplex: 'half' });
  validate(resp, { status: 422 });

  resp = await poteto(_(), { method: 'READ' });
  validate(resp, { status: 200 }, { 'x-test-size': '40' });
  text = await resp.text();
  assert.strictEqual(text, '2021222324252627282930313233343536373839');

  resp = await poteto('', { method: 'LIST' });
  validate(resp, { status: 200 }, { 'content-type': 'application/json' });
  json = await resp.json();
  assert.ok(json.includes(filename));

  resp = await poteto(_(), { method: 'HEAD' });
  validate(resp, { status: 200 }, { 'x-test-size': '40' });
  body = resp.body;
  assert.strictEqual(body, null);
  text = await resp.text();
  assert.strictEqual(text, '');

  resp = await poteto(_(), { method: 'POST' });
  validate(resp, { status: 501 });

  resp = await poteto(_(), { method: 'METHODNOTEXISTS' });
  validate(resp, { status: 405 });

  {
    resp = await poteto(_(), { method: 'READ' });
    validate(resp, { status: 200 }, { 'x-test-size': '40' });
    body = resp.body;
    const reader = body.getReader({ mode: 'byob' });

    let buffer;
    let result;

    buffer = new Uint8Array(24);
    result = await reader.read(buffer);
    assert.strictEqual(result.value.toString(), '50,48,50,49,50,50,50,51,50,52,50,53,50,54,50,55,50,56,50,57,51,48,51,49');
    assert.strictEqual(result.done, false);

    buffer = new Uint8Array(24);
    result = await reader.read(buffer);
    assert.strictEqual(result.value.toString(), '51,50,51,51,51,52,51,53,51,54,51,55,51,56,51,57');
    assert.strictEqual(result.done, false);

    buffer = new Uint8Array(24);
    result = await reader.read(buffer);
    assert.strictEqual(result.value.toString(), '');
    assert.strictEqual(result.done, true);
  }

  await new Promise(_ => setTimeout(_, 9));

  resp = await poteto(_(), { method: 'DELETE' });
  validate(resp);
});
