import 'dotenv/config';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile,appendFile} from 'node:fs/promises';
import path from 'node:path';
import type {Result} from '../src/agent.js';
type Scenario={name:string;url?:string;fixture?:string;goal:()=>string;expected:'succeeded'|'blocked';check:(r:Result,events:any[])=>boolean};
const secret=(key:string)=>{const value=process.env[key];if(!value)throw new Error(`Missing ${key} in .env`);return value;};
const sauce=(locked=false)=>`Log in using username ${secret(locked?'TEST_SAUCE_LOCKED_USERNAME':'TEST_SAUCE_USERNAME')} and password ${secret('TEST_SAUCE_PASSWORD')}. `;
const allText=(events:any[])=>events.filter(e=>e.observation).flatMap(e=>[e.observation.text,...e.observation.elements.flatMap((el:any)=>[el.name||'',el.context||''])]).join('\n');
const finalText=(events:any[])=>events.filter(e=>e.observation).at(-1)?.observation.text||'';
const values=(obj:unknown):string[]=>obj===null?[]:typeof obj==='object'?Object.values(obj as object).flatMap(values):[String(obj)];
const proof=(events:any[])=>events.filter(e=>e.selectionCheck).at(-1)?.selectionCheck?.passed===true;
const scenarios:Scenario[]=[
 {name:'checkout',url:'https://www.saucedemo.com/',goal:()=>sauce()+'Find the cheapest product, add exactly one to the cart and complete checkout using first name Demo, last name User and postal code 00000. Verify order confirmation and return product name and price.',expected:'succeeded',check:(r,e)=>proof(e)&&finalText(e).includes('Thank you for your order!')&&values(r.data).includes('Sauce Labs Onesie')&&values(r.data).includes('$7.99')},
 {name:'blocked-login',url:'https://www.saucedemo.com/',goal:()=>sauce(true)+'Find the cheapest product and complete checkout. Stop honestly if unable to proceed.',expected:'blocked',check:(_,e)=>/locked out/i.test(allText(e))},
 {name:'isp-block',url:'http://the-internet.herokuapp.com/login',goal:()=>`Log in as ${secret('TEST_INTERNET_USERNAME')} with password ${secret('TEST_INTERNET_PASSWORD')} and verify the secure area. Report honestly if access is blocked.`,expected:'blocked',check:(_,e)=>/not accessible|prohibited|blocked|regulatory|telecommunications|safe\.etisalat/i.test(allText(e))},
 {name:'login',url:'https://practicetestautomation.com/practice-test-login/',goal:()=>`Log in as ${secret('TEST_LOGIN_USERNAME')} with password ${secret('TEST_LOGIN_PASSWORD')}. Verify the logged-in success page.`,expected:'succeeded',check:(_,e)=>finalText(e).includes('successfully logged in')&&/log out/i.test(finalText(e))},
 {name:'dynamic',url:'https://demoqa.com/dynamic-properties',goal:()=> 'Wait for the button that appears after five seconds and return its exact text. Do not confuse it with buttons that merely become enabled or change colour.',expected:'succeeded',check:(_,e)=>finalText(e).includes('Visible After 5 Seconds')&&e.some(x=>x.observation&&!x.observation.text.includes('Visible After 5 Seconds'))},
 {name:'form',url:'https://demoqa.com/text-box',goal:()=> 'Fill full name Krish Khatri, email krish@test.com, current address Dubai and permanent address Mumbai. Submit and verify the rendered output matches all four values; checking inputs alone is insufficient.',expected:'succeeded',check:(_,e)=>['Name:Krish Khatri','Email:krish@test.com','Current Address :Dubai','Permananet Address :Mumbai'].every(t=>finalText(e).replace(/\s+/g,'').includes(t.replace(/\s+/g,'')))},
 {name:'extract',url:'https://www.saucedemo.com/',goal:()=>sauce()+'Open the fleece jacket product detail page and return its name, price and full description as JSON.',expected:'succeeded',check:(r,e)=>/inventory-item/.test(e.filter(x=>x.observation).at(-1)?.observation.url||'')&&values(r.data).includes('Sauce Labs Fleece Jacket')&&values(r.data).includes('$49.99')&&values(r.data).some(v=>v.startsWith("It's not every day")&&finalText(e).includes(v))},
 {name:'books',url:'https://books.toscrape.com/',goal:()=> 'Find the cheapest book on the first catalogue page only. Compare all listed prices and return its full title and price. Open its detail page if needed to read the full title. Do not paginate or buy.',expected:'succeeded',check:(r,e)=>proof(e)&&values(r.data).includes('Starving Hearts (Triangular Trade Trilogy, #1)')&&values(r.data).includes('£13.99')},
 {name:'orangehrm',url:'https://opensource-demo.orangehrmlive.com/',goal:()=>`Log in as ${secret('TEST_ORANGEHRM_USERNAME')} with password ${secret('TEST_ORANGEHRM_PASSWORD')}, go to the employee list and give the name and job title of the first employee in default order. Preserve empty fields as null; do not select a different employee. Do not edit records.`,expected:'succeeded',check:(_,e)=>{const c=e.filter(x=>x.selectionCheck?.source).at(-1)?.selectionCheck;return c?.passed===true&&c.source.row.index===1&&c.source.headers.includes('Job Title');}},
 ...['overlay','delayed-overlay'].map(fixture=>({name:fixture==='overlay'?'popup':'delayed-popup',fixture:`tests/fixtures/${fixture}.html`,goal:()=> 'Click the Run check button and confirm the check completed successfully.',expected:'succeeded' as const,check:(_:Result,e:any[])=>finalText(e).includes('Check complete.')&&e.some(x=>x.observation?.text.includes('Cookie preferences'))&&e.some(x=>x.decision?.action.type==='click'&&x.observation===undefined&&/reject|cookie|overlay/i.test(x.decision.reason))}))
];
function printTable(rows:any[]) {
 console.log('\nScenario regression summary');
 console.table(rows.map(r=>({scenario:r.scenario,result:r.pass?'PASS':'FAIL',expected:r.expected,actual:r.actual||'error',steps:r.steps??'-',tokens:r.totalTokens??'-',USD:r.costUsd==null?'-':r.costUsd.toFixed(5),seconds:((r.wallMs??r.runnerWallMs)/1000).toFixed(1)})));
}
if(process.argv[2]==='--recheck') {
 const original=path.resolve(process.argv[3]||'');
 const report=JSON.parse(await readFile(original,'utf8'));
 const rows=[];
 for(const row of report.rows) {
  const scenario=scenarios.find(s=>s.name===row.scenario);
  if(!scenario||!row.runDir){rows.push({...row,previousPass:row.pass,pass:false});continue;}
  const result:Result=JSON.parse(await readFile(path.join(row.runDir,'result.json'),'utf8'));
  const events=(await readFile(path.join(row.runDir,'events.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(l=>JSON.parse(l));
  const pass=result.status===scenario.expected&&scenario.check(result,events);
  rows.push({...row,previousPass:row.pass,pass,reason:pass?result.summary:'Scenario-specific status/evidence check failed'});
 }
 const output=path.join(path.dirname(original),'rechecked-summary.json');
 await writeFile(output,JSON.stringify({...report,originalReport:original,rows},null,2));
 printTable(rows);
 console.log(`${rows.filter(r=>r.pass).length}/${rows.length} passed. Rechecked report: ${output}`);
 await appendFile('NOTES.md',`\nSuite evidence recheck: ${rows.filter(r=>r.pass).length}/${rows.length} passed after correcting the runner to include captured iframe element context. Original report preserved: ${path.relative(process.cwd(),original)}. Rechecked report: ${path.relative(process.cwd(),output)}. No browser task was repeated or agent result changed.\n`);
 process.exit(rows.every(r=>r.pass)?0:1);
}
const batch=new Date().toISOString().replace(/[:.]/g,'-');
const output=path.resolve('runs',`suite-${batch}`);await mkdir(output,{recursive:true});
const rows:any[]=[];
for(const scenario of scenarios){
 console.log(`\n=== ${scenario.name} (expected ${scenario.expected}) ===`);
 const started=performance.now();
 let row:any={scenario:scenario.name,expected:scenario.expected,pass:false};
 try{
  const goal=scenario.goal();
  const args=['--import','tsx',scenario.fixture?'tests/local-fixture.ts':'src/cli.ts',scenario.fixture||scenario.url!,goal];
  const logFile=path.join(output,`${scenario.name}.log`);
  let stdout='';let timedOut=false;
  const child=spawn(process.execPath,args,{cwd:process.cwd(),env:{...process.env,RUN_LABEL:`suite-${batch}-${scenario.name}`},stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});
  const chunks:Buffer[]=[];
  child.stdout.on('data',(data:Buffer)=>{stdout+=data.toString();chunks.push(data);process.stdout.write(data);});
  child.stderr.on('data',(data:Buffer)=>{chunks.push(data);process.stderr.write(data);});
  const timer=setTimeout(()=>{timedOut=true;try{if(child.pid&&process.platform!=='win32')process.kill(-child.pid,'SIGTERM');else child.kill('SIGTERM');}catch{}},(Number(process.env.MAX_MINUTES||10)*60+30)*1000);
  const exitCode=await new Promise<number|null>((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);}).finally(()=>clearTimeout(timer));
  await writeFile(logFile,Buffer.concat(chunks));
  if(timedOut)throw new Error('Scenario exceeded its process deadline');
  const start=stdout.lastIndexOf('\n{');
  if(start<0)throw new Error(`No CLI result JSON (exit ${exitCode})`);
  const result:Result=JSON.parse(stdout.slice(start));
  const events=(await readFile(path.join(result.runDir,'events.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(l=>JSON.parse(l));
  const statusMatches=result.status===scenario.expected;
  const checked=scenario.check(result,events);
  row={...row,actual:result.status,pass:statusMatches&&checked,reason:!statusMatches?result.summary:!checked?'Scenario-specific evidence check failed':result.summary,runDir:result.runDir,...result.metrics};
 }catch(error){row.reason=error instanceof Error?error.message:'Scenario runner error';}
 row.runnerWallMs=Math.round(performance.now()-started);rows.push(row);
 await writeFile(path.join(output,'summary.json'),JSON.stringify({model:process.env.OPENROUTER_MODEL,rows},null,2));
 const reason=String(row.reason).replace(/\s+/g,' ').replace(/\|/g,'/');
 await appendFile('NOTES.md',`\n- CLI suite ${batch}, ${scenario.name}: **${row.pass?'PASS':'FAIL'}** (expected ${scenario.expected}, actual ${row.actual||'runner error'}). ${reason} Evidence: ${row.runDir?`[result](${path.relative(process.cwd(),row.runDir)}/result.json)`:'none'}.\n`);
}
printTable(rows);
console.log(`${rows.filter(r=>r.pass).length}/${rows.length} passed. Report: ${path.join(output,'summary.json')}`);
process.exitCode=rows.every(r=>r.pass)?0:1;
