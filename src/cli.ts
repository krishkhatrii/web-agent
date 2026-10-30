import 'dotenv/config';
import { runTask } from './agent.js';
const [url,...words]=process.argv.slice(2);
if(!url||!words.length){console.error('Usage: npm run agent -- <url> "plain English goal"');process.exit(1);}
runTask(url,words.join(' '),{runLabel:process.env.RUN_LABEL}).then(result=>{console.log(JSON.stringify(result,null,2));process.exitCode=result.status==='succeeded'?0:2;}).catch(error=>{console.error(error.message);process.exitCode=1;});
