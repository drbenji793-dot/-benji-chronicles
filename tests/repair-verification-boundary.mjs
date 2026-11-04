import assert from 'node:assert/strict';
import {repairVerificationEvidence} from '../src/repair-verification-evidence.js';
for(const language of ['ar','en']){
 const before=language==='ar'?'عاد سالم إلى الورشة.':'Salem returned to the workshop.';
 const after=language==='ar'?'عاد سالم إلى الورشة ومعه الرسالة.':'Salem returned to the workshop with the letter.';
 const r={chapterRevision:3,before,after},finding={chapterId:'chapter',paragraph:2};
 const chapter={id:'chapter',revision:4,paragraphs:['An introduction',after,'Ending remains protected']};
 const original=structuredClone(chapter);
 assert.deepEqual(repairVerificationEvidence(r,finding,chapter),{ok:true,afterCount:1,beforeStillPresent:false,chapterRevision:4,verifiedParagraph:2});
 const both={...chapter,paragraphs:['An introduction',after,before]};
 assert.equal(repairVerificationEvidence(r,finding,both).ok,false);
 assert.match(repairVerificationEvidence(r,finding,both).reason,/original saved paragraph is still present/);
 const duplicate={...chapter,paragraphs:[after,after]};
 assert.equal(repairVerificationEvidence(r,finding,duplicate).ok,false);
 assert.equal(repairVerificationEvidence(r,finding,duplicate).afterCount,2);
 const moved={...chapter,paragraphs:[after,'Another paragraph']};
 assert.equal(repairVerificationEvidence(r,finding,moved).ok,false);
 assert.match(repairVerificationEvidence(r,finding,moved).reason,/different paragraph location/);
 const stale={...chapter,revision:3};
 assert.equal(repairVerificationEvidence(r,finding,stale).ok,false);
 assert.equal(repairVerificationEvidence(r,finding,{...chapter,paragraphs:[]}).ok,false);
 assert.equal(repairVerificationEvidence(r,finding,null).ok,false);
 assert.deepEqual(chapter,original);
}
console.log('PASS repair source replacement requires newer chapter, old removed, unique exact after at reviewed paragraph, Arabic/English, no story writes');
