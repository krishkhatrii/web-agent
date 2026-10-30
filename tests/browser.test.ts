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
    await driver.page.setContent('<div role="table"><div role="row"><div role="columnheader">Name</div><div role="columnheader">Job Title</div></div><div role="row"><div role="cell">First Person</div><div role="cell"></div></div><div role="row"><div role="cell">Later Person</div><div role="cell">Engineer</div></div></div><section><article><h3><a title="Full Book Name">Full Book…</a></h3><p>£20.00</p></article><article><h3><a title="Cheap Book">Cheap Book</a></h3><p>£5.00</p></article></section>');
    observation=await driver.observe(path.join(dir,'records.png'));
    const table=observation.collections.find(c=>c.kind==='table')!;
    assert.deepEqual(table.headers,['Name','Job Title']);
    assert.deepEqual(table.rows,[{index:1,cells:['First Person','']},{index:2,cells:['Later Person','Engineer']}]);
    const cards=observation.collections.find(c=>c.kind==='cards')!;
    assert.deepEqual(cards.rows[0].cells.slice(0,2),['Full Book Name','£20.00']);
    assert.deepEqual(cards.rows[1].cells.slice(0,2),['Cheap Book','£5.00']);
    await driver.page.setContent('<div><div><a><div>Item A</div></a><div>Description A</div><div>$20.00</div><button>Add</button></div><div><a><div>Item B</div></a><div>Description B</div><div>$5.00</div><button>Add</button></div></div>');
    observation=await driver.observe(path.join(dir,'div-cards.png'));
    assert.deepEqual(observation.collections.find(c=>c.kind==='cards')!.rows[1].cells.slice(0,2),['Item B','$5.00']);
  } finally {await driver.close(path.join(dir,'trace.zip'));}
});
