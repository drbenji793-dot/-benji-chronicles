import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
const root=new URL('..',import.meta.url).pathname.replace(/\/$/,'');
const standards={};mkdirSync(root+'/public/standards',{recursive:true});
for(const [language,file,code,version] of [['ar','Arabic_Voice_ZK6_v001.html','_zk6','v001'],['en','English_Voice_v004.html','_zk5e','v004']]){
 const raw=readFileSync(root+'/shared-standards/v001/'+file,'utf8'),doc=new JSDOM(raw).window.document;
 const section=language==='en'?doc.querySelector('#rules'):[...doc.querySelectorAll('section')].find(s=>s.querySelector('h2')?.textContent==='26 operating rules');
 const rules=[...section.querySelectorAll('ol > li')].map(x=>x.textContent.trim());
 standards[language]={code,version,craftBaseline:language==='en'?'v003':'_zk6.0',sourceFile:file,sourceSha256:createHash('sha256').update(raw).digest('hex'),sourceURL:'https://benji-hq.dr-z01.chatgpt.site/standards/'+file,localURL:'/standards/'+file,language,rules,observations:language==='ar'?[...doc.querySelectorAll('#additions p')].map(x=>x.textContent.trim()):[],authority:['Latest explicit author decision for the book or passage','Approved book facts, chronology and character knowledge','Versioned writing standard','Editorial suggestions'],scope:'Writing and critique guidance. It does not approve manuscript wording, select book canon or run an AI service.',register:language==='ar'?'Use the book’s selected E (Egyptian narrative) or F (easy literary fusha). Do not infer the register from _zk6 alone.':'Natural adult American English. _zk5e is not an English proficiency tier.'};
 // Keep master wording intact; standalone copies route shared references to HQ.
 for(const a of doc.querySelectorAll('a[href]')){const href=a.getAttribute('href');if(!/^(https?:|#|\/)/.test(href))a.setAttribute('href','https://benji-hq.dr-z01.chatgpt.site/standards/'+href);}
 writeFileSync(root+'/public/standards/'+file,'<!doctype html>\n'+doc.documentElement.outerHTML);
}
writeFileSync(root+'/src/writing-standards-data.js','// Extracted from preserved HQ master guides. Do not edit rule text here.\nexport default '+JSON.stringify(standards,null,2)+';\n');
console.log(Object.values(standards).map(x=>({code:x.code,rules:x.rules.length,version:x.version})));
