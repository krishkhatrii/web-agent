export type ModelCall = {
  call:number;phase:'plan'|'verify';attempt:number;requestedModel:string;model:string;
  responseId:string|null;provider:string|null;httpStatus:number|null;latencyMs:number;
  usage:Record<string,any>|null;error:string|null;
};
export function summarizeCalls(calls:ModelCall[],model:string,steps:number,wallMs:number) {
  const sum=(get:(c:ModelCall)=>unknown)=>{
    const values=calls.map(get);
    return values.every(v=>typeof v==='number'&&Number.isFinite(v))?values.reduce<number>((a,v)=>a+(v as number),0):null;
  };
  return {model,steps,calls:calls.length,promptTokens:sum(c=>c.usage?.prompt_tokens),completionTokens:sum(c=>c.usage?.completion_tokens),totalTokens:sum(c=>c.usage?.total_tokens),costUsd:sum(c=>c.usage?.cost),modelLatencyMs:calls.reduce((a,c)=>a+c.latencyMs,0),wallMs,missingUsageCalls:calls.filter(c=>!c.usage).length};
}
