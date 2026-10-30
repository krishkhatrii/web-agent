import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkSelection,parseNumber,parseDate,type RecordSource,type Selection} from '../src/records.js';
const sources:RecordSource[]=[{step:7,url:'https://example.com/list',collections:[{id:'g0',kind:'table',frame:0,headers:['Name','Job Title','Price'],rows:[{index:1,cells:['First Person','','£20.00']},{index:2,cells:['Later Person','Engineer','£5.00']}],truncated:false}]}];
const selection:Selection={step:7,collection:'g0',row:1,order:{op:'position',position:1},fields:{name:[0],job_title:[1]}};
test('first record preserves empty fields; a populated later row cannot replace it',()=>{
  assert.equal(checkSelection(selection,{name:'First Person',job_title:null},sources).passed,true);
  assert.equal(checkSelection({...selection,row:2},{name:'Later Person',job_title:'Engineer'},sources).passed,false);
  assert.equal(checkSelection(selection,{name:'First Person',job_title:'Engineer'},sources).passed,false);
  assert.equal(checkSelection(selection,{name:'First Person',job_title:'not shown'},sources).passed,false);
});
test('cheapest compares all records and binds outputs to the selected record',()=>{
  const cheapest:Selection={...selection,order:{op:'min',column:2,valueType:'number'},row:2,fields:{name:[0],price:[2]}};
  assert.equal(checkSelection(cheapest,{name:'Later Person',price:'£5.00'},sources).passed,true);
  assert.equal(checkSelection({...cheapest,row:1},{name:'First Person',price:'£20.00'},sources).passed,false);
  assert.equal(checkSelection(cheapest,{name:'First Person',price:'£5.00'},sources).passed,false);
  assert.equal(checkSelection({...cheapest,step:99},{name:'Later Person',price:'£5.00'},sources).passed,false);
});

function comparison(values:string[],op:'min'|'max',valueType:'number'|'date',row:number) {
  const records:RecordSource[]=[{step:0,url:'https://example.com/',collections:[{id:'g0',kind:'table',frame:0,headers:['Name','Value'],truncated:false,rows:values.map((value,i)=>({index:i+1,cells:[`Record ${i+1}`,value]}))}]}];
  return checkSelection({step:0,collection:'g0',row,order:{op,column:1,valueType},fields:{name:[0],value:[1]}},{name:`Record ${row}`,value:values[row-1]},records);
}
test('most expensive uses maximum numeric value with currency and grouped thousands',()=>{
  assert.equal(comparison(['$9.99','$1,234.50','$25.00'],'max','number',2).passed,true);
  assert.equal(comparison(['$9.99','$1,234.50','$25.00'],'max','number',3).passed,false);
  assert.equal(comparison(['-10','-2','-30'],'max','number',2).passed,true);
});
test('latest and earliest compare valid dates and timezone-normalized instants',()=>{
  assert.equal(comparison(['2026-01-31','2026-10-30','2025-12-31'],'max','date',2).passed,true);
  assert.equal(comparison(['2026-01-31','2026-10-30','2025-12-31'],'min','date',3).passed,true);
  assert.equal(comparison(['2026-10-30T11:00:00+04:00','2026-10-30T08:00:00Z'],'max','date',2).passed,true);
  assert.equal(comparison(['2026-10-30','2026-01-01'],'max','date',2).passed,false);
});
test('ties, unparseable values and mixed units cannot certify an extremum',()=>{
  for(const op of ['min','max'] as const) {
    assert.equal(comparison(['£5.00','£5.00'],op,'number',1).passed,false);
    assert.equal(comparison(['2026-01-01','2026-01-01'],op,'date',1).passed,false);
    assert.equal(comparison(['2026-01-01T12:00:00+04:00','2026-01-01T08:00:00Z'],op,'date',1).passed,false);
    for(const bad of ['','unknown','$1,23.45','£5.00','5%'])assert.equal(comparison(['$2.00',bad],op,'number',1).passed,false);
    for(const bad of ['','2026-02-30','03/04/2026','2026-10-30T08:00:00','2026-10-30T08:00:00Z'])assert.equal(comparison(['2026-01-01',bad],op,'date',1).passed,false);
  }
});
test('parsers reject malformed values rather than accepting partial numbers or normalized invalid dates',()=>{
  assert.deepEqual(parseNumber(' AED 1,234.50 '),{value:1234.5,unit:'AED'});
  for(const raw of ['12 apples','12,34','1.234,56','Infinity','9007199254740992','$5 EUR'])assert.equal(parseNumber(raw),null);
  assert.ok(parseDate('2024-02-29'));
  for(const raw of ['2025-02-29','2026-13-01','2026-01-00','2026-01-01T24:00:00Z','2026-01-01T12:60:00Z','2026-01-01T12:00:00+15:00','yesterday'])assert.equal(parseDate(raw),null);
});
test('position supports nth selection and does not compare empty fields',()=>{
  assert.equal(checkSelection({...selection,row:2,order:{op:'position',position:2}},{name:'Later Person',job_title:'Engineer'},sources).passed,true);
  assert.equal(checkSelection({...selection,row:1,order:{op:'position',position:2}},{name:'First Person',job_title:null},sources).passed,false);
});

test('common named and unambiguous numeric dates match ISO calendar dates',()=>{
  for(const raw of ['Oct 30, 2026','October 30, 2026','oct 30 2026','Oct. 30, 2026','30 Oct 2026','30 October 2026','30/10/2026','10/30/2026','30-10-2026','10-30-2026'])
    assert.deepEqual(parseDate(raw),parseDate('2026-10-30'),raw);
  assert.deepEqual(parseDate('Sept 15, 2026'),parseDate('2026-09-15'));
  assert.deepEqual(parseDate('29/02/2024'),parseDate('2024-02-29'));
  assert.equal(comparison(['Oct 30, 2026','31/10/2026','2026-10-29'],'max','date',2).passed,true);
  assert.equal(comparison(['Oct 30, 2026','30/10/2026'],'max','date',1).passed,false);
});
test('ambiguous numeric dates and impossible calendar dates remain unparseable',()=>{
  for(const raw of ['03/04/2026','12/11/2026','10/10/2026','03-04-2026','30/13/2026','31/04/2026','29/02/2025','Feb 30, 2026','31 April 2026','Octoberfoo 30, 2026','30/10-2026','30/10/26']) {
    assert.equal(parseDate(raw),null,raw);
    assert.equal(comparison(['2026-01-01',raw],'max','date',1).passed,false,raw);
  }
});
