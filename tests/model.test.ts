import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {ModelCall} from '../src/metrics.js';
import {Model} from '../src/model.js';
test('invalid completion JSON is repaired using validation feedback and full action schema',async()=>{
  const original=globalThis.fetch;
  const requests:any[]=[];
  const calls:ModelCall[]=[];
  globalThis.fetch=(async(_url:any,init:any)=>{
    requests.push(JSON.parse(init.body));
    const content=requests.length===1?JSON.stringify({reason:'done',action:{type:'finish',summary:'done',evidence:['Confirmation']}}):JSON.stringify({reason:'Confirmation observed',action:{type:'finish',summary:'done',evidence:[{kind:'text',expected:'Confirmation'}]}});
    return new Response(JSON.stringify({id:'test-response',model:'test-model',usage:{prompt_tokens:100,completion_tokens:20,total_tokens:120,cost:0.001},choices:[{message:{content}}]}),{status:200,headers:{'Content-Type':'application/json'}});
  }) as typeof fetch;
  try {
    const decision=await new Model('test-key','test-model',call=>{calls.push(call);}).decide({goal:'test'});
    assert.equal(decision.action.type,'finish');
    assert.equal(requests.length,2);
    assert.equal(calls.length,2);
    assert.deepEqual(calls.map(c=>c.attempt),[1,2]);
    assert.ok(calls.every(c=>c.usage?.total_tokens===120&&c.usage?.cost===0.001&&c.latencyMs>=0&&c.phase==='plan'));
    assert.ok(!JSON.stringify(calls).includes('test-key'));
    assert.ok(requests[1].messages[1].content.includes('Validation error'));
    assert.ok(requests[0].messages[0].content.includes('JSON schema'));
  }finally{globalThis.fetch=original;}
});

test('verification and failed network requests emit telemetry without inventing usage',async()=>{
  const original=globalThis.fetch;
  const calls:ModelCall[]=[];
  const model=new Model('test-key','test-model',call=>{calls.push(call);});
  try {
    globalThis.fetch=(async()=>new Response(JSON.stringify({usage:{prompt_tokens:10,completion_tokens:5,total_tokens:15,cost:0},choices:[{message:{content:JSON.stringify({verdict:'succeeded',reason:'Observed'})}}]}),{status:200})) as typeof fetch;
    await model.verifyGoal({});
    assert.equal(calls[0].phase,'verify');
    assert.equal(calls[0].usage?.cost,0);
    globalThis.fetch=(async()=>{throw new TypeError('Network failure');}) as typeof fetch;
    await assert.rejects(model.decide({}));
    assert.equal(calls[1].phase,'plan');
    assert.equal(calls[1].usage,null);
    assert.equal(calls[1].httpStatus,null);
    assert.equal(calls[1].error,'TypeError');
  }finally{globalThis.fetch=original;}
});
