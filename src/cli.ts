import {readdir,readFile,stat,writeFile,lstat} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
import {checkSet,inferConfiguration,readConfiguration,markdownReport,type DocumentFile} from './checker';

async function main(){
 const args=process.argv.slice(2);const directory=args.shift();
 if(!directory||directory==='--help'){console.log('Usage: npm run check -- DOCUMENT_FOLDER [--config CONFIG.json] [--format json|markdown] [--output REPORT]\nExit 0: no errors; exit 1: errors found; exit 2: invalid input. Warnings do not change exit 0.');return;}
 let configurationPath='',format='markdown',output='';
 while(args.length){const flag=args.shift(),value=args.shift();if(!value)throw Error(`Missing value for ${flag}.`);if(flag==='--config')configurationPath=value;else if(flag==='--format')format=value;else if(flag==='--output')output=value;else throw Error(`Unknown option ${flag}.`);}
 if(!['markdown','json'].includes(format))throw Error('Format must be json or markdown.');
 const root=resolve(directory);if((await lstat(root)).isSymbolicLink())throw Error('The document folder must not be a symbolic link.');
 const documents:DocumentFile[]=[];let total=0;
 async function walk(folder:string,depth=0){if(depth>15)throw Error('Document nesting exceeds 15 folders.');for(const entry of (await readdir(folder,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){if(entry.name.startsWith('.')||entry.name==='node_modules')continue;const path=join(folder,entry.name);if(entry.isSymbolicLink())throw Error(`Symbolic links are not followed: ${relative(root,path)}`);if(entry.isDirectory())await walk(path,depth+1);else if(entry.isFile()&&/\.md$/i.test(entry.name)){const size=(await stat(path)).size;total+=size;if(size>200000||total>1000000||documents.length>=100)throw Error('Input exceeds 100 documents, 200 KB per document or 1 MB total.');const data=await readFile(path);let content:string;try{content=new TextDecoder('utf-8',{fatal:true}).decode(data);}catch{throw Error(`${entry.name} is not valid UTF-8.`);}documents.push({path:relative(root,path).replaceAll('\\','/'),content});}}}
 await walk(root);
 if(configurationPath&&(await stat(resolve(configurationPath))).size>200000)throw Error('Configuration exceeds 200 KB.');
 const config=configurationPath?readConfiguration(await readFile(resolve(configurationPath),'utf8')):inferConfiguration(documents);
 const result=checkSet(documents,config);const report=format==='json'?JSON.stringify(result,null,2)+'\n':markdownReport(result)+'\n';
 if(output)await writeFile(resolve(output),report,{flag:'wx'});else process.stdout.write(report);
 process.exitCode=result.findings.some(f=>f.severity==='error')?1:0;
}
main().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=2;});
