import {activeRecord} from './current-book-brief.js';
import {escapeHTML as h} from './dsl-engine.js';

// The saved chapter reference on a question is evidence of a link, not of a manuscript edit.
export function questionChapterEvidence(question,chapters=[]){
 const id=question.sourceChapterId||question.chapterId||null;
 if(!id)return {id:null,state:'No saved chapter linked',chapter:null,savedRevision:null,currentRevision:null};
 const chapter=chapters.find(c=>c.id===id&&activeRecord(c));
 const savedRevision=question.sourceChapterRevision??question.chapterRevision??null;
 if(!chapter)return {id,state:'Linked chapter unavailable',chapter:null,savedRevision,currentRevision:null};
 const currentRevision=chapter.revision??null;
 const state=savedRevision!==null&&savedRevision!==currentRevision?'Linked chapter revision changed':
  savedRevision===null?'No source revision recorded':'Saved chapter revision matches';
 return {id,state,chapter,savedRevision,currentRevision};
}
export function questionChapterEvidenceHTML(q,chapters=[],{chapterLink}={}){
 const evidence=questionChapterEvidence(q,chapters);
 if(!evidence.id)return '<p data-question-chapter>No saved chapter source linked. Verify manuscript context separately.</p>';
 const label=evidence.chapter?.title||evidence.id;
 const href=evidence.chapter?.chapter_number!=null?chapterLink?.(evidence.chapter.chapter_number):null;
 return '<details data-question-chapter><summary>Saved chapter source · '+h(evidence.state)+'</summary>'+
  '<p>Chapter: '+(href?'<a href="'+h(href)+'" dir="auto">'+h(label)+'</a>':h(label))+'</p>'+
  '<p>Stable ID: '+h(evidence.id)+' · Saved revision: '+h(evidence.savedRevision??'Not recorded')+' · Current revision: '+h(evidence.currentRevision??'Unavailable')+'</p>'+
  '<p>Linked evidence is not automatic approval to edit chapter prose.</p></details>';
}
