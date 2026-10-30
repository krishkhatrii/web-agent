import 'dotenv/config';
import { mkdir, appendFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BrowserDriver, type Observation } from './browser.js';
import { checkCompletionSelection, type RecordSource } from './records.js';
import { ReadinessBudget } from './readiness.js';
import {summarizeCalls,type ModelCall} from './metrics.js';
import { Model } from './model.js';
import { publicUrl } from './schema.js';
export type Result = {status:'succeeded'|'blocked'|'failed'|'cancelled';summary:string;runDir:string;data?:unknown;metrics?:ReturnType<typeof summarizeCalls>};
export type Hooks = {progress?:(message:string,screenshot?:string)=>Promise<void>;ask?:(question:string)=>Promise<string>;signal?:AbortSignal};
export async function runTask(url:string,goal:string,hooks:Hooks={}):Promise<Result> {
  publicUrl(url);
  const started=performance.now();
  let steps=0,activeStep=-1;
  const calls:ModelCall[]=[];
  const runDir=path.resolve('runs',new Date().toISOString().replace(/[:.]/g,'-'));
  await mkdir(runDir,{recursive:true});
  const driver=new BrowserDriver();
  const history:any[]=[];
  const recordSources:RecordSource[]=[];
  const readiness=new ReadinessBudget();
  let result:Result={status:'failed',summary:'Step limit reached without verified completion',runDir};
  const deadline=Date.now()+Number(process.env.MAX_MINUTES||10)*60000;
  const signal=AbortSignal.any([AbortSignal.timeout(Math.max(1000,deadline-Date.now())),...(hooks.signal?[hooks.signal]:[])]);
  const notify=async(message:string,screenshot?:string)=>{
    console.log(message);
    try{await hooks.progress?.(message,screenshot);}catch{console.warn('Progress delivery failed; local run artifacts retained');}
  };
  const log=async(event:unknown)=>appendFile(path.join(runDir,'events.jsonl'),JSON.stringify({at:new Date().toISOString(),...event as object})+'\n');
  const model=new Model(undefined,undefined,async call=>{calls.push(call);await log({step:activeStep,modelCall:call});});
  try {
    await driver.start(url);
    await notify('Browser launched. Starting task.');
    let repeats=0;let previous='';
    for(let step=0;step<Number(process.env.MAX_STEPS||45);step++) {
      signal.throwIfAborted();
      activeStep=step;
      const observation=await driver.observe(path.join(runDir,`${String(step).padStart(3,'0')}.png`));
      await log({step,observation});
      if(observation.collections.length)recordSources.push({step,url:observation.url,collections:observation.collections});
      const decision=await model.decide({goal,step,observation,recordSources,history:history.slice(-16),readiness:{waitsUsed:readiness.used,waitLimit:3,waitMilliseconds:2000}},signal);
      steps++;
      const policy=readiness.apply(decision.action,observation.elements);
      const action=policy.action;
      await log({step,decision});
      if(policy.retry)await log({step,readinessWait:readiness.used,effectiveAction:action});
      await notify(`Step ${step+1}: ${policy.retry?`Not ready yet; waiting and re-observing (${readiness.used}/3).`:decision.reason}`,observation.screenshot);
      const signature=JSON.stringify({action,url:observation.url,text:observation.text,elements:observation.elements});
      repeats=signature===previous?repeats+1:0;previous=signature;
      if(repeats>=2&&!policy.retry) {result={status:'blocked',summary:'Repeated action produced no observable progress',runDir};break;}
      if(action.type==='blocked') {result={status:'blocked',summary:action.reason,runDir};break;}
      if(action.type==='ask') {
        if(!hooks.ask) {result={status:'blocked',summary:action.question,runDir};break;}
        const answer=await Promise.race([hooks.ask(action.question),new Promise<never>((_,reject)=>{signal.addEventListener('abort',()=>reject(new Error('Question cancelled or timed out')),{once:true});})]);
        history.push({question:action.question,answer}); continue;
      }
      if(action.type==='finish') {
        const selectionCheck=checkCompletionSelection(goal,action,recordSources);
        await log({step,selectionCheck});
        if(!selectionCheck.passed){
          result={status:'failed',summary:`Not verified: ${selectionCheck.reason}`,runDir};
          break;
        }
        const checks=await driver.verify(action,observation);
        await log({step,checks});
        if(checks.every(c=>c.passed)) {
          const audit=await model.verifyGoal({goal,observation,recordSources,selectionCheck,history:history.slice(-16),claim:action},signal);
          await log({step,audit});
          if(audit.verdict==='succeeded') {result={status:'succeeded',summary:action.summary,data:action.data,runDir};break;}
          if(audit.verdict==='blocked') {result={status:'blocked',summary:audit.reason,runDir};break;}
          history.push({action,error:audit.reason});continue;
        }
        history.push({action,error:'Completion evidence did not match the observed page',checks});continue;
      }
      try {await driver.act(action);history.push({action,reason:decision.reason,before:{url:observation.url,text:observation.text.slice(0,5000)},result:'Executed; inspect next observation to verify effect'});}
      catch(error) {history.push({action,error:error instanceof Error?error.message:'Browser action failed'});}
    }
  } catch(error) {
    result={status:hooks.signal?.aborted?'cancelled':'failed',summary:signal.aborted?'Task cancelled or time limit reached':error instanceof Error?error.message:'Task failed',runDir};
  } finally {
    await driver.close(path.join(runDir,'trace.zip')).catch(()=>{});
    result.metrics=summarizeCalls(calls,process.env.OPENROUTER_MODEL!,steps,Math.round(performance.now()-started));
    await writeFile(path.join(runDir,'result.json'),JSON.stringify(result,null,2));
  }
  await notify(`${result.status.toUpperCase()}: ${result.summary}`);
  return result;
}
