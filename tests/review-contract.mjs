import assert from 'node:assert/strict';
import {reviewPacket,importReview} from '../src/critique-workflow.js';
for(const language of ['ar','en']){
 const data={rules:'Preserve the final letter exactly.',summary:'Saved plan',workshop:{questions:[]}};
 const chapter={id:'c',revision:1,paragraphs:[language==='ar'?'الخطاب محفوظ.':'The letter remains.']};
 const empty={id:'empty',revision:1,paragraphs:[]};
 const before=structuredClone(data),context={bookId:'b',branchId:'br',revision:1,language,writer:'Benji'};
 const packet=await reviewPacket(data,context,[chapter,empty]);
 assert.equal(packet.reviewContract.criteria.length,9);
 assert.equal(packet.reviewContract.writingVoice,language==='ar'?'_zk5':'_zk5e');
 assert.equal(packet.currentPlanning.rules,data.rules);
 assert.match(packet.reviewContract.instructions.join(' '),/protected dialogue, letters, endings/);
 assert.match(packet.reviewContract.instructions.join(' '),/Research gap/);
 assert.deepEqual(packet.chapters[1].paragraphs,[]);
 packet.findings=[{chapterId:'empty',chapterRevision:1,paragraph:1,quote:'Invented quote',title:'Fake',issue:'Missing',impact:'Meaning',repair:'Change',kind:'Textual fact',severity:'Major',confidence:'High',recommendation:'Rewrite'}];
 await assert.rejects(()=>importReview(data,packet,[0],context,[chapter,empty]),/quote must match/);
 packet.findings[0]={...packet.findings[0],chapterId:'c',quote:chapter.paragraphs[0],kind:'Research gap',recommendation:'Verify'};
 const result=await importReview(data,packet,[0],context,[chapter,empty]);
 assert.equal(result.editorialFindings[0].kind,'Research gap');
 assert.equal(result.editorialFindings[0].status,'proposed');
 assert.equal(result.rules,data.rules);assert.deepEqual(data,before);
 assert.match(result.editorialFindings[0].scope,/no manuscript approval/);
}
console.log('PASS portable review criteria and approved voice, retained author restrictions, research uncertainty, empty-chapter evidence rejection and proposal-only imports in both languages');
