import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Action, publicUrl } from '../src/schema.js';
test('rejects model-invented execution and malformed element references',()=>{
  assert.equal(Action.safeParse({type:'evaluate',script:'alert(1)'}).success,false);
  assert.equal(Action.safeParse({type:'click',target:'#submit'}).success,false);
  assert.equal(Action.safeParse({type:'wait',milliseconds:60000}).success,false);
  assert.equal(Action.safeParse({type:'finish',summary:'done',evidence:[]}).success,false);
});
test('navigation rejects local resources and embedded credentials',()=>{
  for(const url of ['file:///etc/passwd','http://localhost/','http://127.0.0.1/','http://10.0.0.1/','https://user:pass@example.com/'])assert.throws(()=>publicUrl(url));
  assert.equal(publicUrl('https://example.com'),'https://example.com/');
});
