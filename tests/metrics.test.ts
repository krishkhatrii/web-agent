import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeCalls,type ModelCall} from '../src/metrics.js';
const call:ModelCall={call:1,phase:'plan',attempt:1,requestedModel:'test',model:'test',responseId:null,provider:null,httpStatus:200,latencyMs:100,usage:{prompt_tokens:10,completion_tokens:5,total_tokens:15,cost:0.002},error:null};
test('summary includes every planning, verification and retry call',()=>{
  const summary=summarizeCalls([call,{...call,call:2,phase:'verify'}],'test',1,1000);
  assert.equal(summary.calls,2);assert.equal(summary.steps,1);
  assert.equal(summary.totalTokens,30);assert.equal(summary.costUsd,0.004);
  assert.equal(summary.modelLatencyMs,200);assert.equal(summary.wallMs,1000);
});
test('missing usage or cost remains unknown, not zero',()=>{
  assert.equal(summarizeCalls([{...call,usage:null}],'test',0,100).totalTokens,null);
  assert.equal(summarizeCalls([{...call,usage:{total_tokens:15}}],'test',1,100).costUsd,null);
});
