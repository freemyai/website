import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const files=['src','assets','scripts','tests'].flatMap(dir=>fs.readdirSync(dir,{withFileTypes:true})
  .filter(item=>item.isFile()&&item.name.endsWith('.mjs'))
  .map(item=>path.join(dir,item.name))).sort();
for(const file of files){
  const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});
  if(result.error) throw result.error;
  if(result.status!==0) process.exit(result.status||1);
}
console.log(`Checked syntax in ${files.length} JavaScript modules.`);
