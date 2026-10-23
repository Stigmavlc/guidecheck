import {unified} from 'unified';
import remarkParse from 'remark-parse';
import Slugger from 'github-slugger';
export type DocumentFile={path:string;content:string};
export type Pair={en:string;es:string;sections:{en:string;es:string}[]};
export type Term={language:'en'|'es';preferred:string;avoid:string[]};
export type Configuration={pairs:Pair[];glossary:Term[]};
export type Heading={text:string;depth:number;line:number;anchor:string;number:string};
export type Finding={id:string;rule:string;severity:'error'|'warning';file:string;line:number;message:string;excerpt:string;related?:{file:string;line:number}};
export type Analysis={documents:DocumentFile[];headings:Record<string,Heading[]>;findings:Finding[];checkedAt:string;scope:string};
type Node={type:string;value?:string;depth?:number;url?:string;identifier?:string;children?:Node[];position?:{start:{line:number;column:number}}};
const parser=unified().use(remarkParse);
export const scope='Local Markdown structure, configured heading pairs, house terms and references. No translation quality, factual accuracy, compliance, external URL or asset checks.';
export function pathKey(input:string):string{
 if(!input||input.includes('\0')||input.startsWith('/')||/^[a-z]:/i.test(input))throw Error('Use relative paths inside the document set.');
 const parts:string[]=[];
 for(const part of input.replaceAll('\\','/').split('/')){if(!part||part==='.')continue;if(part==='..'){if(!parts.length)throw Error('A path leaves the document set.');parts.pop();}else parts.push(part);}
 if(!parts.length)throw Error('A document path is empty.');return parts.join('/');
}
export function validateDocuments(input:DocumentFile[]):DocumentFile[]{
 if(!input.length||input.length>100)throw Error('Load between 1 and 100 Markdown documents.');
 let bytes=0;const used=new Set<string>();
 return input.map(f=>{const path=pathKey(f.path),size=new TextEncoder().encode(f.content).length;bytes+=size;if(!/\.md$/i.test(path))throw Error(`${path}: only .md documents are supported.`);if(used.has(path))throw Error(`Duplicate path: ${path}`);used.add(path);if(size>200000||bytes>1000000)throw Error('Input exceeds 200 KB per document or 1 MB total.');return {path,content:f.content};});
}
const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
function keys(v:Record<string,unknown>,allowed:string[]){if(Object.keys(v).some(k=>!allowed.includes(k)))throw Error('Unknown configuration field.');}
function text(v:unknown):v is string{return typeof v==='string'&&v.trim().length>0&&v.length<=200;}
export function readConfiguration(raw:string):Configuration{
 let value:unknown;try{value=JSON.parse(raw);}catch{throw Error('Configuration is not valid JSON.');}
 if(!object(value))throw Error('Configuration must be an object.');keys(value,['pairs','glossary']);
 if(!Array.isArray(value.pairs)||!Array.isArray(value.glossary)||value.pairs.length>100||value.glossary.length>100)throw Error('Use pairs and glossary arrays with at most 100 entries each.');
 const used=new Set<string>();
 const pairs=value.pairs.map(p=>{if(!object(p))throw Error('A pair must be an object.');keys(p,['en','es','sections']);if(!text(p.en)||!text(p.es)||!Array.isArray(p.sections)||p.sections.length>100)throw Error('A pair needs en and es paths and a sections array.');const en=pathKey(p.en),es=pathKey(p.es);if(en===es||used.has(en)||used.has(es))throw Error('A document can appear in only one pair.');used.add(en);used.add(es);const seenEn=new Set<string>(),seenEs=new Set<string>();const sections=p.sections.map(s=>{if(!object(s))throw Error('A mapped section must be an object.');keys(s,['en','es']);if(!text(s.en)||!text(s.es)||seenEn.has(s.en)||seenEs.has(s.es))throw Error('Mapped headings must be nonempty and unique within the pair.');seenEn.add(s.en);seenEs.add(s.es);return {en:s.en,es:s.es};});return {en,es,sections};});
 const glossary=value.glossary.map(t=>{if(!object(t))throw Error('A glossary entry must be an object.');keys(t,['language','preferred','avoid']);if((t.language!=='en'&&t.language!=='es')||!text(t.preferred)||!Array.isArray(t.avoid)||!t.avoid.length||t.avoid.length>30||t.avoid.some(a=>!text(a)))throw Error('A glossary entry needs en or es, a preferred term and 1 to 30 avoided terms.');return {language:t.language as 'en'|'es',preferred:t.preferred,avoid:t.avoid as string[]};});
 return {pairs,glossary};
}
export function inferConfiguration(files:DocumentFile[]):Configuration{
 const paths=new Set(files.map(f=>f.path)),pairs:Pair[]=[];
 for(const path of paths){if(/\.en\.md$/i.test(path))pairs.push({en:path,es:path.replace(/\.en\.md$/i,'.es.md'),sections:[]});else if(/\.es\.md$/i.test(path)){const en=path.replace(/\.es\.md$/i,'.en.md');if(!paths.has(en))pairs.push({en,es:path,sections:[]});}}
 return {pairs,glossary:[]};
}
function content(n:Node):string{return n.value??(n.children??[]).map(content).join('');}
function parse(file:DocumentFile){
 const nodes:Node[]=[];const walk=(n:Node)=>{nodes.push(n);for(const c of n.children??[])walk(c);};walk(parser.parse(file.content) as Node);
 const slugger=new Slugger();const headings:Heading[]=nodes.filter(n=>n.type==='heading').map(n=>{const label=content(n);return {text:label,depth:n.depth??1,line:n.position?.start.line??1,anchor:slugger.slug(label),number:label.match(/^(\d+(?:\.\d+)*)[.)]?\s/u)?.[1]??''};});
 return {file,nodes,headings,lines:file.content.split(/\r?\n/),definitions:new Map(nodes.filter(n=>n.type==='definition').map(n=>[(n.identifier??'').toLowerCase(),n.url??'']))};
}
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function checkSet(input:DocumentFile[],config:Configuration):Analysis{
 const documents=validateDocuments(input),parsed=documents.map(parse),byPath=new Map(parsed.map(p=>[p.file.path,p])),findings:Finding[]=[];
 const add=(rule:string,severity:Finding['severity'],p:typeof parsed[number],line:number,message:string,related?:Finding['related'])=>findings.push({id:`finding-${findings.length+1}`,rule,severity,file:p.file.path,line,message,excerpt:p.lines[line-1]??'',related});
 for(const p of parsed){const numbers=new Map<string,Heading>();
  p.headings.forEach((h,i)=>{if(i&&h.depth>p.headings[i-1].depth+1)add('heading-level','warning',p,h.line,`Heading level jumps from ${p.headings[i-1].depth} to ${h.depth}.`);if(h.number){if(numbers.has(h.number))add('duplicate-number','error',p,h.line,`Section number ${h.number} is repeated.`,{file:p.file.path,line:numbers.get(h.number)!.line});else numbers.set(h.number,h);}});
  for(const n of p.nodes){const line=n.position?.start.line??1;
   if(['link','image','linkReference','imageReference'].includes(n.type)){const url=n.url??p.definitions.get((n.identifier??'').toLowerCase());if(url===undefined){add('undefined-reference','error',p,line,'The link reference has no definition.');continue;}if(/^(https?:|mailto:|tel:|data:)/i.test(url)||url.startsWith('//'))continue;if(/^[a-z][\w+.-]*:/i.test(url)){add('unsupported-link','warning',p,line,'This scheme is outside the local link check.');continue;}
    const hash=url.indexOf('#'),rawPath=(hash<0?url:url.slice(0,hash)).split('?')[0];let targetPath:string,anchor:string;
    try{const part=decodeURIComponent(rawPath);anchor=decodeURIComponent(hash<0?'':url.slice(hash+1));targetPath=part?pathKey((p.file.path.includes('/')?p.file.path.slice(0,p.file.path.lastIndexOf('/')+1):'')+part):p.file.path;}catch{add('invalid-local-link','error',p,line,'The link has invalid encoding or leaves the document set.');continue;}
    const target=byPath.get(targetPath);if(!target){add('missing-file','error',p,line,`Target ${targetPath} is not in the loaded Markdown set. Assets are outside this check.`);continue;}if(anchor&&!target.headings.some(h=>h.anchor===anchor))add('missing-anchor','error',p,line,`Anchor #${anchor} does not exist in ${targetPath}.`);
   }
   if(n.type==='text')for(const match of (n.value??'').matchAll(/\b(?:sections?|apartados?|secci[oó]n(?:es)?)\s+(\d+(?:\.\d+)*)/giu)){if(!numbers.has(match[1]))add('section-reference','error',p,line,`Section ${match[1]} has no numbered heading in this document.`);}
  }
 }
 for(const pair of config.pairs){const en=byPath.get(pair.en),es=byPath.get(pair.es);if(!en||!es){add('missing-counterpart','error',en??es??parsed[0],1,`Pair needs both ${pair.en} and ${pair.es}.`);continue;}
  if(en.headings.length!==es.headings.length)add('section-count','warning',es,1,`English has ${en.headings.length} headings; Spanish has ${es.headings.length}.`,{file:en.file.path,line:1});
  en.headings.forEach((h,i)=>{const other=es.headings[i];if(other&&(h.depth!==other.depth||h.number!==other.number))add('section-structure','warning',es,other.line,`Heading ${i+1} differs in level or section number from English.`,{file:en.file.path,line:h.line});});
  for(const language of ['en','es'] as const){const p=language==='en'?en:es;let previous=-1;
   for(const section of pair.sections){const matches=p.headings.map((h,i)=>({h,i})).filter(x=>x.h.text===section[language]);if(matches.length!==1){add('mapped-section','error',p,matches[0]?.h.line??1,`Expected one heading “${section[language]}”; found ${matches.length}.`);continue;}if(matches[0].i<previous)add('section-order','warning',p,matches[0].h.line,'Mapped sections differ from the configured order.');previous=matches[0].i;}
   for(const term of config.glossary.filter(t=>t.language===language))for(const n of p.nodes.filter(n=>n.type==='text'))for(const avoid of term.avoid){const pattern=new RegExp(`(?<![\\p{L}\\p{N}_])${escape(avoid)}(?![\\p{L}\\p{N}_])`,'giu');if(pattern.test(n.value??''))add('glossary','warning',p,n.position?.start.line??1,`Use “${term.preferred}” rather than “${avoid}” in ${language} prose.`);}
  }
 }
 return {documents,headings:Object.fromEntries(parsed.map(p=>[p.file.path,p.headings])),findings,checkedAt:new Date().toISOString(),scope};
}
export function markdownReport(r:Analysis):string{const lines=['# GuideCheck report','',`Checked: ${r.checkedAt}`,'',r.scope,'',`${r.documents.length} documents, ${r.findings.length} findings.`,''];for(const f of r.findings){lines.push(`## ${f.severity.toUpperCase()}: ${f.rule}`,'',`${f.file}:${f.line}`,f.message,'',`    ${f.excerpt}`,'');if(f.related)lines.push(`Related: ${f.related.file}:${f.related.line}`,'');}return lines.join('\n');}
