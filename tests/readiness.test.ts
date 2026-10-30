import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ReadinessBudget} from '../src/readiness.js';
test('disabled targets get a bounded wait budget, including across changing IDs',()=>{
  const budget=new ReadinessBudget();
  for(let i=0;i<3;i++) {
    const result=budget.apply({type:'click',target:`e${i}`},[{id:`e${i}`,disabled:true}]);
    assert.deepEqual(result,{action:{type:'wait',milliseconds:2000},retry:true});
  }
  assert.equal(budget.apply({type:'click',target:'e9'},[{id:'e9',disabled:true}]).action.type,'blocked');
  assert.equal(budget.used,3);
  assert.deepEqual(budget.apply({type:'click',target:'e9'},[{id:'e9',disabled:false}]),{action:{type:'click',target:'e9'},retry:false});
});
test('temporary blocked decisions share the same budget; real access blocks stop immediately',()=>{
  const budget=new ReadinessBudget();
  assert.equal(budget.apply({type:'blocked',cause:'not_ready',reason:'Control disabled'},[]).retry,true);
  for(const cause of ['access_denied','missing_input','other'] as const){
    const action={type:'blocked' as const,cause,reason:'Cannot proceed'};
    assert.deepEqual(budget.apply(action,[{id:'e0',disabled:true}]),{action,retry:false});
  }
  assert.equal(budget.used,1);
});
test('popup dismissal and other enabled actions remain available during readiness recovery',()=>{
  const budget=new ReadinessBudget();
  budget.apply({type:'blocked',cause:'not_ready',reason:'Loading'},[]);
  const action={type:'click' as const,target:'e1'};
  assert.deepEqual(budget.apply(action,[{id:'e0',disabled:true},{id:'e1',disabled:false}]),{action,retry:false});
});
