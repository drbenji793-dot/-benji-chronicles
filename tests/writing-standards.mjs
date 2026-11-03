import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {writingStandard,writingStandardHTML,writingStandardReference,assertWritingStandard} from '../src/writing-standards.js';
import {currentBookBrief} from '../src/current-book-brief.js';
import {reviewPacket,importReview} from '../src/critique-workflow.js';
for(const language of ['ar','en']){
 const s=writingStandard(language),raw=readFileSync('shared-standards/v001/'+s.sourceFile,'utf8'),doc=new JSDOM(raw).window.document;
 const rules=language==='ar'?[...doc.querySelectorAll('section')].find(x=>x.querySelector('h2')?.textContent==='26 operating rules').querySelectorAll('ol > li'):doc.querySelectorAll('#rules ol > li');
 assert.deepEqual(s.rules,[...rules].map(x=>x.textContent.trim()));assert.equal(s.sourceSha256,createHash('sha256').update(raw).digest('hex'));assert.equal(s.rules.length,language==='ar'?26:20);
 const portable=new JSDOM(writingStandardHTML(language)).window.document;assert.equal(portable.querySelectorAll('script').length,0);assert.equal(portable.querySelector('details').open,false);assert(portable.body.textContent.includes(s.version));
 assert.doesNotThrow(()=>assertWritingStandard(writingStandardReference(language),language));assert.throws(()=>assertWritingStandard({...s,sourceSha256:'old'},language),/Writing standard changed/);assert.throws(()=>assertWritingStandard(s,language==='ar'?'en':'ar'),/another language/);
 const data={summary:'Unchanged story',events:[],characters:[],workshop:{questions:[]}},original=JSON.stringify(data),context={bookId:'b',branchId:'r',revision:3,language};
 const brief=currentBookBrief({book:{id:'b',language},branch:{id:'r',revision:3,data}});assert.equal(brief.writingStandard.code,s.code);assert.equal(JSON.stringify(data),original);
 const chapter={id:'c',revision:2,paragraphs:['Original text.']},packet=await reviewPacket(data,context,[chapter]);packet.findings=[{chapterId:'c',chapterRevision:2,paragraph:1,quote:'Original text.',title:'Review',issue:'Inspect clarity',impact:'Meaning',repair:'Consider clarity',kind:'Interpretation',severity:'Minor',confidence:'Medium',recommendation:'Verify'}];
 await assert.rejects(()=>importReview(data,{...packet,writingStandard:{...packet.writingStandard,version:'old'}},[0],context,[chapter]),/Writing standard changed/);
 const imported=await importReview(data,packet,[0],context,[chapter]);assert.equal(imported.editorialFindings[0].importSource.writingStandard.code,s.code);assert.equal(imported.editorialFindings[0].status,'proposed');
 const legacy=structuredClone(packet);delete legacy.writingStandard;const older=await importReview(data,legacy,[0],context,[chapter]);assert.equal(older.editorialFindings[0].importSource.writingStandard,null);assert.match(older.editorialFindings[0].importSource.writingStandardStatus,/Legacy/);
 const guide=new JSDOM(readFileSync('public/standards/'+s.sourceFile,'utf8')).window.document;assert.equal(guide.title,doc.title);
 for(const a of guide.querySelectorAll('a[href]'))assert(/^(https?:|#|\/)/.test(a.getAttribute('href')),'standalone guide links must resolve');
}
assert.equal(writingStandard('unknown'),null);assert.match(writingStandardHTML('unknown'),/not selected/);assert.match(writingStandard('ar').register,/Do not infer/);assert.equal(writingStandard('en').craftBaseline,'v003');
console.log('PASS exact writing guide rules/hashes, language and version guards, source attribution, portable copies, legacy packet labels and unchanged manuscript data');
