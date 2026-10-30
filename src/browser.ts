import { chromium, type Browser, type Page, type Locator } from 'playwright';
import { Action, publicUrl } from './schema.js';
export type Observation = {url:string;title:string;text:string;elements:any[];screenshot:string};
export class BrowserDriver {
  browser!: Browser; page!: Page; private targets = new Map<string,Locator>();
  async start(url: string) {
    this.browser = await chromium.launch({headless:process.env.HEADLESS!=='false'});
    const context = await this.browser.newContext({viewport:{width:1280,height:900}});
    await context.tracing.start({screenshots:true,snapshots:true,sources:true});
    this.page = await context.newPage();
    this.page.setDefaultTimeout(8000);
    this.page.on('dialog', dialog=>void dialog.dismiss());
    await this.navigate(url);
  }
  private async navigate(url:string) {
    const destination=publicUrl(url);
    for(let attempt=0;attempt<3;attempt++) {
      try {await this.page.goto(destination,{waitUntil:'domcontentloaded',timeout:20000});return;}
      catch(error) {if(attempt===2)throw error;await new Promise(r=>setTimeout(r,500*(attempt+1)));}
    }
  }
  async observe(screenshot: string): Promise<Observation> {
    // IDs are regenerated each observation. Element handles are resolved before acting.
    this.targets.clear();
    const elements:any[] = [];
    for (const [frameIndex, frame] of this.page.frames().entries()) {
      const items = await frame.evaluate(() => {
        document.querySelectorAll('[data-web-agent-id]').forEach(e=>e.removeAttribute('data-web-agent-id'));
        const candidates = Array.from(document.querySelectorAll('a,button,input,textarea,select,[role="button"],[role="link"],[contenteditable="true"],[tabindex]'));
        return candidates.filter(el=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';}).slice(0,200).map((el,index)=>{
          const id=`e${index}`; el.setAttribute('data-web-agent-id',id);
          const input=el as HTMLInputElement;
          const label=input.labels ? Array.from(input.labels).map(l=>l.innerText).join(' ') : '';
          return {localId:id,tag:el.tagName.toLowerCase(),role:el.getAttribute('role'),type:el.getAttribute('type'),context:(el.closest('article,li,tr,[role="listitem"]') as HTMLElement || el.parentElement?.parentElement)?.innerText?.slice(0,650),name:el.getAttribute('aria-label')||el.getAttribute('title')||label||(el as HTMLElement).innerText||el.getAttribute('placeholder')||el.getAttribute('name')||'',value:input.type==='password'?(input.value?'[redacted]':''):input.value,disabled:input.disabled||el.getAttribute('aria-disabled')==='true',href:el.getAttribute('href'),options:el.tagName==='SELECT'?Array.from((el as HTMLSelectElement).options).map(o=>({label:o.label,value:o.value})):undefined};
        });
      }).catch(()=>[]);
      for (const item of items) {
        const id=`e${elements.length}`;
        this.targets.set(id,frame.locator(`[data-web-agent-id="${item.localId}"]`));
        elements.push({...item,id,frame:frameIndex,localId:undefined});
      }
    }
    await this.page.screenshot({path:screenshot,fullPage:false});
    return {url:this.page.url(),title:await this.page.title(),text:(await this.page.locator('body').innerText()).slice(0,24000),elements,screenshot};
  }
  target(id:string) { const el=this.targets.get(id);if(!el)throw new Error('Unknown or stale element ID');return el; }
  async act(action: Action) {
    switch(action.type) {
      case 'click': await this.target(action.target).click(); break;
      case 'fill': await this.target(action.target).fill(action.value); break;
      case 'select': await this.target(action.target).selectOption(action.value); break;
      case 'press': await this.target(action.target).press(action.key==='Space'?' ':action.key); break;
      case 'navigate': await this.navigate(action.url); break;
      case 'back': await this.page.goBack({waitUntil:'domcontentloaded'}); break;
      case 'scroll': await this.page.mouse.wheel(0,action.direction==='down'?650:-650); break;
      case 'wait': await this.page.waitForTimeout(action.milliseconds); break;
      default: throw new Error('Not a browser action');
    }
    await this.page.waitForLoadState('domcontentloaded',{timeout:3000}).catch(()=>{});
    await this.page.waitForTimeout(250);
  }
  async verify(action:Extract<Action,{type:'finish'}>,observation:Observation) {
    const checks = [];
    for(const e of action.evidence) {
      let actual='';
      if(e.kind==='text') actual=observation.text;
      else if(e.kind==='url') actual=observation.url;
      else if(e.target) actual=await this.target(e.target).inputValue();
      checks.push({...e,passed:e.kind==='value'?actual===e.expected:actual.includes(e.expected)});
    }
    return checks;
  }
  async close(trace:string) {
    if(!this.browser)return;
    try { await this.page?.context().tracing.stop({path:trace}); } finally { await this.browser.close(); }
  }
}
