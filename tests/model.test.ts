import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Model} from '../src/model.js';
test('invalid completion JSON is repaired using validation feedback and full action schema',async()=>{
  const original=globalThis.fetch;
  const requests:any[]=[];
  globalThis.fetch=(async(_url:any,init:any)=>{
    requests.push(JSON.parse(init.body));
    const content=requests.length===1?JSON.stringify({reason:'done',action:{type:'finish',summary:'done',evidence:['Confirmation']}}):JSON.stringify({reason:'Confirmation observed',action:{type:'finish',summary:'done',evidence:[{kind:'text',expected:'Confirmation'}]}});
    return new Response(JSON.stringify({choices:[{message:{content}}]}),{status:200,headers:{'Content-Type':'application/json'}});
  }) as typeof fetch;
  try {
    const decision=await new Model('test-key','test-model').decide({goal:'test'});
    assert.equal(decision.action.type,'finish');
    assert.equal(requests.length,2);
    assert.ok(requests[1].messages[1].content.includes('Validation error'));
    assert.ok(requests[0].messages[0].content.includes('JSON schema'));
  }finally{globalThis.fetch=original;}
});
