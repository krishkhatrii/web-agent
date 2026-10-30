// Transport-only harness: serve a local HTML file to the unmodified agent.
// No actions, selectors, or planning decisions are injected into the agent.
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {runTask} from '../src/agent.js';
const [file,...words]=process.argv.slice(2);
if(!file||!words.length)throw new Error('Usage: tsx tests/local-fixture.ts <html-file> <goal>');
const html=await readFile(file,'utf8');
const url='https://local-fixture.test/task';
const launch=chromium.launch.bind(chromium);
chromium.launch=async options=>{
  const browser=await launch(options);
  const newContext=browser.newContext.bind(browser);
  browser.newContext=async options=>{
    const context=await newContext(options);
    await context.route(url,route=>route.fulfill({status:200,contentType:'text/html',body:html}));
    return context;
  };
  return browser;
};
const result=await runTask(url,words.join(' '),{runLabel:process.env.RUN_LABEL});
console.log(JSON.stringify(result,null,2));
process.exitCode=result.status==='succeeded'?0:2;
