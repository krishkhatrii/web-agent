import type { Action } from './schema.js';
export type Collection = {id:string;kind:'table'|'cards';frame:number;headers:string[];rows:{index:number;cells:string[]}[];truncated:boolean};
export type RecordSource = {step:number;url:string;collections:Collection[]};
export type Selection = NonNullable<Extract<Action,{type:'finish'}>['selection']>;
const normalize=(value:string)=>value.replace(/\s+/g,' ').trim();
type Parsed = {value:number;unit:string};
const currency:Record<string,string>={'$':'USD','£':'GBP','€':'EUR',USD:'USD',GBP:'GBP',EUR:'EUR',AED:'AED',CAD:'CAD',AUD:'AUD',JPY:'JPY'};
// Conservative, full-cell parsing. Commas mean thousands; decimal commas are ambiguous.
export function parseNumber(raw:string):Parsed|null {
  const match=normalize(raw).match(/^(USD|GBP|EUR|AED|CAD|AUD|JPY|[$£€])?\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*(USD|GBP|EUR|AED|CAD|AUD|JPY|%)?$/);
  if(!match)return null;
  const value=Number(match[2].replace(/,/g,''));
  if(!Number.isFinite(value)||Math.abs(value)>Number.MAX_SAFE_INTEGER)return null;
  const prefix=currency[match[1]],suffix=currency[match[3]]??match[3];
  if(prefix&&suffix&&prefix!==suffix)return null;
  return {value,unit:prefix??suffix??'number'};
}
// Accept ISO calendar dates or ISO timestamps with an explicit timezone, never guess locale.
export function parseDate(raw:string):Parsed|null {
  const match=normalize(raw).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2}))?$/);
  if(!match)return null;
  const [,year,month,day,hour,minute,second,,zone]=match;
  const y=Number(year),m=Number(month),d=Number(day);
  const leap=y%4===0&&(y%100!==0||y%400===0);
  const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  if(y<1||m<1||m>12||d<1||d>days[m-1])return null;
  if(hour!==undefined&&(Number(hour)>23||Number(minute)>59||Number(second)>59))return null;
  if(zone&&zone!=='Z') {
    const h=Number(zone.slice(1,3)),minutes=Number(zone.slice(4));
    if(h>14||minutes>59||(h===14&&minutes!==0))return null;
  }
  const value=Date.parse(hour===undefined?`${year}-${month}-${day}T00:00:00Z`:raw.trim());
  return Number.isFinite(value)?{value,unit:hour===undefined?'calendar-date':'timestamp'}:null;
}
export function checkSelection(selection:Selection,data:Record<string,unknown>|undefined,sources:RecordSource[]) {
  const source=sources.find(s=>s.step===selection.step);
  const collection=source?.collections.find(c=>c.id===selection.collection);
  const row=collection?.rows.find(r=>r.index===selection.row);
  if(!source||!collection||!row)return {passed:false,reason:'Unknown observation, collection, or row'};
  if(collection.truncated)return {passed:false,reason:'Collection is truncated; cannot verify selection across its full scope'};
  const order=selection.order;
  if(order.op==='position') {
    if(row.index!==order.position)return {passed:false,reason:'Selected row does not match the requested 1-based position (empty cells do not skip rows)'};
  } else {
    const values=collection.rows.map(r=>order.valueType==='number'?parseNumber(r.cells[order.column]??''):parseDate(r.cells[order.column]??''));
    if(values.some(v=>v===null))return {passed:false,reason:'A comparison value is empty, ambiguous, invalid, or cannot be parsed'};
    const parsed=values as Parsed[];
    if(new Set(parsed.map(v=>v.unit)).size!==1)return {passed:false,reason:'Cannot compare mixed units or currencies'};
    const extreme=(order.op==='min'?Math.min:Math.max)(...parsed.map(v=>v.value));
    const winners=collection.rows.filter((_,i)=>parsed[i].value===extreme);
    if(winners.length!==1)return {passed:false,reason:'Selection is tied; there is no unique minimum or maximum'};
    if(winners[0].index!==row.index)return {passed:false,reason:'Selected record does not match the requested minimum or maximum'};
  }
  if(!Object.keys(selection.fields).length)return {passed:false,reason:'Provide field-to-column mappings for the extracted data'};
  for(const [field,columns] of Object.entries(selection.fields)) {
    if(columns.some(c=>c>=row.cells.length))return {passed:false,reason:`Invalid column for ${field}`};
    const expected=normalize(columns.map(c=>row.cells[c]).join(' '));
    const actual=data?.[field];
    if(expected==='' ? actual!==null&&actual!=='' : typeof actual!=='string'||normalize(actual)!==expected)
      return {passed:false,reason:`Field ${field} must come from selected row ${row.index}: ${JSON.stringify(expected||null)}`};
  }
  return {passed:true,reason:'Record selection and mapped output fields match observed cells',source:{step:source.step,url:source.url,collection:collection.id,headers:collection.headers,row}};
}
