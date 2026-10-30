import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runTask} from '../src/agent.js';
import {BrowserDriver} from '../src/browser.js';
import {Model} from '../src/model.js';
test('missing selection proof fails before evidence checks or an approving model audit',async()=>{
  const original={start:BrowserDriver.prototype.start,observe:BrowserDriver.prototype.observe,close:BrowserDriver.prototype.close,verify:BrowserDriver.prototype.verify,decide:Model.prototype.decide,audit:Model.prototype.verifyGoal,key:process.env.OPENROUTER_API_KEY,model:process.env.OPENROUTER_MODEL};
  let evidenceCalls=0,auditCalls=0;
  try{
    process.env.OPENROUTER_API_KEY='test';process.env.OPENROUTER_MODEL='test';
    BrowserDriver.prototype.start=async()=>{};
    BrowserDriver.prototype.close=async()=>{};
    BrowserDriver.prototype.observe=async()=>({url:'https://example.com/',title:'Books',text:'Book A £5.00',elements:[],collections:[],screenshot:''});
    BrowserDriver.prototype.verify=async()=>{evidenceCalls++;return [{kind:'text',expected:'Book A',passed:true}];};
    Model.prototype.decide=async()=>({reason:'Done',action:{type:'finish',summary:'Book A is cheapest',evidence:[{kind:'text',expected:'Book A'}],data:{title:'Book A',price:'£5.00'}}});
    Model.prototype.verifyGoal=async()=>{auditCalls++;return {verdict:'succeeded',reason:'Approved'};};
    const result=await runTask('https://example.com/','Find the cheapest book');
    assert.equal(result.status,'failed');
    assert.match(result.summary,/Not verified:.*proof.*missing/);
    assert.equal(evidenceCalls,0);assert.equal(auditCalls,0);
  }finally{
    BrowserDriver.prototype.start=original.start;BrowserDriver.prototype.observe=original.observe;BrowserDriver.prototype.close=original.close;BrowserDriver.prototype.verify=original.verify;Model.prototype.decide=original.decide;Model.prototype.verifyGoal=original.audit;
    if(original.key===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=original.key;
    if(original.model===undefined)delete process.env.OPENROUTER_MODEL;else process.env.OPENROUTER_MODEL=original.model;
  }
});

test('metadata repair can qualify paths once but cannot change column mappings or repeat browser actions',async()=>{
  const original={start:BrowserDriver.prototype.start,observe:BrowserDriver.prototype.observe,close:BrowserDriver.prototype.close,verify:BrowserDriver.prototype.verify,act:BrowserDriver.prototype.act,decide:Model.prototype.decide,audit:Model.prototype.verifyGoal,repair:Model.prototype.repairSelectionFields,key:process.env.OPENROUTER_API_KEY,model:process.env.OPENROUTER_MODEL};
  try {
    process.env.OPENROUTER_API_KEY='test';process.env.OPENROUTER_MODEL='test';
    BrowserDriver.prototype.start=async()=>{};BrowserDriver.prototype.close=async()=>{};
    BrowserDriver.prototype.act=async()=>{throw new Error('Must not repeat a browser action');};
    BrowserDriver.prototype.observe=async()=>({url:'https://example.com/complete',title:'Complete',text:'Order confirmed',elements:[],collections:[{id:'g0',kind:'cards',frame:0,headers:['Title','Price'],rows:[{index:1,cells:['Item A','$5.00']}],truncated:false}],screenshot:''});
    BrowserDriver.prototype.verify=async()=>[{kind:'text',expected:'Order confirmed',passed:true}];
    Model.prototype.decide=async()=>({reason:'Complete',action:{type:'finish',summary:'Done',evidence:[{kind:'text',expected:'Order confirmed'}],data:{product:{Title:'Item A',Price:'$5.00'}},selection:{step:0,collection:'g0',row:1,order:{op:'min',column:1,valueType:'number'},fields:{Title:[0],Price:[1]}}}});
    for(const valid of [true,false]) {
      let repairs=0,audits=0;
      Model.prototype.repairSelectionFields=async()=>{repairs++;return {'product.Title':[valid?0:1],'product.Price':[1]};};
      Model.prototype.verifyGoal=async()=>{audits++;return {verdict:'succeeded',reason:'Observed'};};
      const result=await runTask('https://example.com/','Buy the cheapest item');
      assert.equal(repairs,1);assert.equal(audits,valid?1:0);
      assert.equal(result.status,valid?'succeeded':'failed');
      if(valid)assert.deepEqual(result.data,{product:{Title:'Item A',Price:'$5.00'}});
    }
  } finally {
    BrowserDriver.prototype.start=original.start;BrowserDriver.prototype.observe=original.observe;BrowserDriver.prototype.close=original.close;BrowserDriver.prototype.verify=original.verify;BrowserDriver.prototype.act=original.act;Model.prototype.decide=original.decide;Model.prototype.verifyGoal=original.audit;Model.prototype.repairSelectionFields=original.repair;
    if(original.key===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=original.key;
    if(original.model===undefined)delete process.env.OPENROUTER_MODEL;else process.env.OPENROUTER_MODEL=original.model;
  }
});
