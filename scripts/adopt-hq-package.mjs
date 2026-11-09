import {readFile,mkdir,writeFile,rename,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const origin='https://benji-hq.vercel.app';
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function validatePackage(p){
 if(p?.format!=='benji-hq-package'||p.schemaVersion!==1||!Number.isInteger(p.version)||p.version<1||p.id!==`hq-v${String(p.version).padStart(3,'0')}`)throw Error('Unsupported HQ package');
 if(p.source!==origin||p.policy?.automaticUpdates!==false||p.policy?.manuscriptWrites!==false)throw Error('Unsafe package policy');
 if(!Array.isArray(p.rules)||!Array.isArray(p.codes)||!Array.isArray(p.assets)||!p.scope||!p.writing)throw Error('Incomplete package');
 const names=new Set();for(const a of p.assets){if(!/^[A-Za-z0-9_-]+\.(html|json|css|js)$/.test(a.name)||a.url!=='/standards/'+a.name||!/^[a-f0-9]{64}$/.test(a.sha256)||names.has(a.name))throw Error('Invalid asset');names.add(a.name)}
 return p;
}
async function bytesAt(source){if(source.startsWith('https:')){const url=new URL(source);if(url.origin!==origin||!url.pathname.startsWith('/standards/'))throw Error('Use an HQ standards URL');const res=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000)});if(!res.ok)throw Error('HQ fetch failed');return Buffer.from(await res.arrayBuffer())}return readFile(source)}
export async function adopt(source,expected,{root=process.cwd(),assetRoot=null}={}){
 if(!/^[a-f0-9]{64}$/.test(expected||''))throw Error('Supply the expected package SHA256 from the HQ release record');
 const raw=await bytesAt(source);if(hash(raw)!==expected)throw Error('Package checksum mismatch');const p=validatePackage(JSON.parse(raw));
 const target=path.join(root,'public','standards','hq',p.id),base=path.dirname(target),stage=target+'.staging';
 let existing;try{existing=await readFile(path.join(target,'package.json'))}catch{}
 if(existing&&hash(existing)!==expected)throw Error('An immutable package with this version already exists');
 // Validate every asset before any local adoption is changed.
 const assets=[];for(const a of p.assets){const data=assetRoot?await readFile(path.join(assetRoot,a.name)):await bytesAt(origin+a.url);if(hash(data)!==a.sha256)throw Error('Asset checksum mismatch: '+a.name);assets.push([a.name,data])}
 if(!existing){await mkdir(base,{recursive:true});await rm(stage,{recursive:true,force:true});await mkdir(stage);await writeFile(path.join(stage,'package.json'),raw);for(const [name,data] of assets)await writeFile(path.join(stage,name),data);await rename(stage,target)}
 const record={format:'benji-hq-adoption',version:p.version,packageId:p.id,packageSha256:expected,adoptedAt:new Date().toISOString(),scope:'Shared guidance and code reference; existing writing baselines and book decisions retained',source:origin,automaticUpdates:false,manuscriptWrites:false};
 await writeFile(path.join(base,'adoption.json.tmp'),JSON.stringify(record,null,2)+'\n');await rename(path.join(base,'adoption.json.tmp'),path.join(base,'adoption.json'));
 return record;
}
if(process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname){try{const [source,expected,assetRoot]=process.argv.slice(2);if(!source)throw Error('Usage: node scripts/adopt-hq-package.mjs PACKAGE_URL_OR_FILE EXPECTED_SHA256 [LOCAL_ASSET_DIRECTORY]');const record=await adopt(source,expected,{assetRoot});console.log('Installed '+record.packageId+' in local source. Review, test and publish this site separately.')}catch(e){console.error(e.message);process.exitCode=1}}
