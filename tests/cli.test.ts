import {describe,it,expect} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathKey,readConfiguration} from '../src/checker';

describe('report output preserves existing files',()=>{
 for(const target of ['input','report','symlink'] as const)it(`refuses to overwrite ${target}`,()=>{
  const root=mkdtempSync(join(tmpdir(),'guidecheck-'));
  try{
   const docs=join(root,'docs');mkdirSync(docs);
   const input=join(docs,'guide.md');writeFileSync(input,'# Guide\n\nOriginal source.\n');
   const report=target==='input'?input:join(root,'report.md');
   if(target==='report')writeFileSync(report,'Earlier report.');
   if(target==='symlink')symlinkSync(input,report);
   const before=readFileSync(report,'utf8');
   const result=spawnSync(process.execPath,['--import','tsx',resolve('src/cli.ts'),docs,'--output',report],{encoding:'utf8'});
   expect(result.status).toBe(2);expect(result.stderr).toContain('EEXIST');
   expect(readFileSync(report,'utf8')).toBe(before);
   expect(readFileSync(input,'utf8')).toBe('# Guide\n\nOriginal source.\n');
  }finally{rmSync(root,{recursive:true,force:true});}
 });
});
describe('bounded local input',()=>{
 it('rejects Windows rooted and UNC paths',()=>{
  expect(()=>pathKey('\\server\\share\\guide.md')).toThrow();
  expect(()=>pathKey('\\guide.md')).toThrow();
 });
 it('bounds configuration before parsing',()=>{
  expect(()=>readConfiguration(' '.repeat(200001))).toThrow('Configuration exceeds 200 KB.');
 });
});
