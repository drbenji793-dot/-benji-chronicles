import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const root=process.argv[2]||'public';
const code=fs.readFileSync(new URL('./uni003.js',import.meta.url),'utf8');
const changes=new Map();let count=0;
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.html')){const old=fs.readFileSync(p,'utf8');if(!/<html[\s>]/i.test(old)||old.includes('id="uni003-code"'))continue;const next=old+'\n<script id="uni003-code">'+code+'</script>\n';fs.writeFileSync(p,next);changes.set(crypto.createHash('sha256').update(old).digest('hex'),{hash:crypto.createHash('sha256').update(next).digest('hex'),bytes:Buffer.byteLength(next)});count++;}}}
walk(root);
const manifest=path.join(root,'current-sources.json');
if(fs.existsSync(manifest)){const data=JSON.parse(fs.readFileSync(manifest,'utf8'));function update(obj){if(!obj||typeof obj!=='object')return;for(const [key,value]of Object.entries(obj)){if(typeof value==='string'&&changes.has(value)){const row=changes.get(value);obj[key]=row.hash;if('bytes'in obj)obj.bytes=row.bytes;}else update(value)}}update(data);fs.writeFileSync(manifest,JSON.stringify(data,null,2)+'\n')}
console.log('Back to top added to '+count+' standalone pages');
