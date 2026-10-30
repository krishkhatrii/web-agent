import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { BrowserDriver } from '../src/browser.js';
test('discovers controls, fills, verifies evidence, waits for dynamic content, and closes',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'web-agent-'));
  const driver=new BrowserDriver();
  try {
    // Route a synthetic page, independent of public demos or model credentials.
    const {chromium}=await import('playwright');
    driver.browser=await chromium.launch({headless:true});
    const context=await driver.browser.newContext();
    await context.tracing.start({screenshots:true,snapshots:true});
    driver.page=await context.newPage();
    await driver.page.setContent('<label>Quantity<input type="number"></label><button onclick="setTimeout(()=>document.querySelector(\'p\').textContent=\'Revealed\',300)">Load</button><p></p>');
    let observation=await driver.observe(path.join(dir,'before.png'));
    const input=observation.elements.find(e=>e.tag==='input');
    await driver.act({type:'fill',target:input.id,value:'42'});
    observation=await driver.observe(path.join(dir,'filled.png'));
    const checks=await driver.verify({type:'finish',summary:'Filled',evidence:[{kind:'value',target:input.id,expected:'42'}]},observation);
    assert.equal(checks[0].passed,true);
    const bad=await driver.verify({type:'finish',summary:'False claim',evidence:[{kind:'text',expected:'Order confirmed'}]},observation);
    assert.equal(bad[0].passed,false);
    await driver.act({type:'click',target:observation.elements.find(e=>e.tag==='button').id});
    await driver.page.getByText('Revealed',{exact:true}).waitFor();
    observation=await driver.observe(path.join(dir,'after.png'));
    assert.ok(observation.text.includes('Revealed'));
  } finally {await driver.close(path.join(dir,'trace.zip'));}
});
