import {activeRecord} from './current-book-brief.js';
import {questionState} from './question-lifecycle.js';
import {selectedSynopsis} from './source-tools.js';
import {escapeHTML as h} from './dsl-engine.js';

const containers={events:'events',event:'events',characters:'characters',character:'characters',questions:'questions',question:'questions',decision:'questions',decisions:'decisions',fact:'decisions',places:'places',place:'places',chapters:'chapters',chapter:'chapters'};
const text=v=>String(v??'').trim();
const statusOf=r=>text(r?.status||r?.recordStatus).toLowerCase();
const currentStatus=r=>{
 if(!r)return 'Source missing';
 if(!activeRecord(r))return 'Retired source';
 const status=statusOf(r);
 if(['conflict','conflicting'].includes(status))return 'Recorded conflict';
 if(['approved','accepted','applied','resolved'].includes(status))return 'Recorded approval';
 if(['proposal','proposed','candidate'].includes(status))return 'Proposal only';
 if(['open','deferred','question','answered'].includes(status))return 'Unresolved or pending choice';
 if(status==='written')return 'Written source, approval unverified';
 return 'Status not established';
};
const allRows=(data,chapters,kind)=>{
 const normalized=containers[kind];
 if(normalized==='questions')return data.workshop?.questions||[];
 if(normalized==='chapters')return chapters;
 return data[normalized]||[];
};
const sourceKey=source=>[containers[source.kind]||source.kind,source.id].join(':');

export function synopsisAuthorityAudit(data={},context={}){
 const {bookId=null,branchId=null,revision=null,publishedRevision=null,publishedBranchId=null,publicationRecordRevision=null,publishedAt=null,view='short',scope='plan',chapters=[]}=context;
 const sections=selectedSynopsis(data,{view,scope,chapters}).map(section=>{
  const links=(section.sources||[]).map(source=>{
   const row=allRows(data,chapters,source.kind).find(x=>x.id===source.id);
   const changed=section.review.differences.some(d=>sourceKey(d)===sourceKey(source));
   return {kind:source.kind,id:source.id,name:row?.name||row?.title||row?.prompt||source.id,
    status:currentStatus(row),currentRevision:row?.revision??null,savedRevision:source.revision??null,
    changed,retired:!!row&&!activeRecord(row)};
  });
  const flags=[
   ...(!links.length?['No explicit source links']:[]),
   ...(links.some(x=>x.changed)?['Linked source changed']:[]),
   ...(links.some(x=>['Recorded conflict','Retired source','Source missing','Proposal only','Unresolved or pending choice'].includes(x.status))?['Author review required before treating linked claims as settled']:[])
  ];
  const nameCandidates=[];
  const passage=text(section.text);
  for(const link of links.filter(x=>containers[x.kind]==='characters')){
   const character=(data.characters||[]).find(c=>c.id===link.id);
   if(!character)continue;
   for(const alias of character.aliases||[]){
    const candidate=text(typeof alias==='string'?alias:alias?.name);
    if(candidate&&candidate!==text(character.name)&&passage.includes(candidate))nameCandidates.push({characterId:character.id,matchedName:candidate,currentName:character.name||'',review:'Recorded name or alias in text, not automatically obsolete'});
   }
  }
  return {id:section.id,title:section.title||section.id,origin:section.id==='summary'?'Current summary':section.id==='full'?'Story Brief':section.id.startsWith('outline:')?'Chapter plan':'Saved synopsis section',
   status:section.status||'Unclassified',review:section.review.state,hasText:!!passage,links,flags,nameCandidates};
 });
 const questions=(data.workshop?.questions||[]).filter(activeRecord).filter(q=>['open','conflict','deferred'].includes(questionState(q))).map(q=>({id:q.id,title:q.title||q.prompt||q.id,status:questionState(q)}));
 const findings=(data.editorialFindings||[]).filter(activeRecord).filter(f=>!['rejected','resolved','obsolete'].includes(statusOf(f))).map(f=>({id:f.id,title:f.title||f.issue||f.id,status:f.status||'Unclassified'}));
 const pubKnown=Number.isInteger(publishedRevision);
 const samePath=!!publishedBranchId&&!!branchId&&publishedBranchId===branchId;
 const publishedState=!pubKnown?'Book publication revision not established here':
  publishedBranchId&&branchId&&!samePath?'A different planning branch is published':
  samePath&&Number.isInteger(revision)&&revision!==publishedRevision?'Working revision differs from published branch revision':
  samePath&&revision===publishedRevision?'Published branch revision matches this working source':
  'Recorded, verify source scope';
 return {bookId,branchId,workingRevision:revision,publishedRevision:pubKnown?publishedRevision:null,publishedBranchId,publicationRecordRevision,publishedAt,
  publishedState,view,scope,sections,questions,findings};
}

export function synopsisAuthorityHTML(audit,{href=()=>null,includeNotes=true}={}){
 const maybeLink=(kind,id,label)=>{
  const target=href(kind,id);return target?'<a href="'+h(target)+'" dir="auto">'+h(label)+'</a>':h(label);
 };
 return '<details data-synopsis-authority style="max-width:100%;overflow-wrap:anywhere"><summary>Current source checks ('+audit.sections.length+' sections)</summary>'+
  '<p>Book: '+h(audit.bookId||'Unknown')+' · Branch: '+h(audit.branchId||'Unknown')+' · Working revision: '+h(audit.workingRevision??'Not recorded')+'</p>'+
  '<p>Published branch revision: '+h(audit.publishedRevision??'Not recorded')+' · '+h(audit.publishedState)+'. Working and published versions are not assumed identical.</p>'+
  '<p>Published branch: '+h(audit.publishedBranchId||'Not recorded')+' · Publication record r'+h(audit.publicationRecordRevision??'Not recorded')+' · Published at: '+h(audit.publishedAt||'Not recorded')+'</p>'+
  '<p>Scope: '+h(audit.scope)+' · View: '+h(audit.view)+'. All classifications reflect stored metadata, not literary truth.</p>'+
  audit.sections.map(section=>'<details><summary dir="auto">'+h(section.title)+' · '+h(section.review)+'</summary>'+
   '<p>'+h(section.origin)+' · '+h(section.status)+' · '+(section.hasText?'Text retained':'No text recorded')+'</p>'+
   section.links.map(link=>'<p>'+maybeLink(link.kind,link.id,link.name)+' · '+h(link.status)+' · Saved r'+h(link.savedRevision??'Unknown')+' · Current r'+h(link.currentRevision??'Unknown')+(link.changed?' · Source changed':'')+'</p>').join('')+
   section.flags.map(flag=>'<p>'+h(flag)+'</p>').join('')+
   section.nameCandidates.map(c=>'<p dir="auto">Name to review: '+h(c.matchedName)+' · Current card: '+maybeLink('characters',c.characterId,c.currentName)+' · Not an automatic correction</p>').join('')+
   '</details>').join('')+
  (includeNotes?'<details data-pending-decisions><summary>Pending decisions ('+audit.questions.length+')</summary>'+
  audit.questions.map(q=>'<p dir="auto">'+maybeLink('questions',q.id,q.title)+' · '+h(q.status)+'</p>').join('')+
  (!audit.questions.length?'<p>No explicitly open, deferred or conflicting questions recorded for this path.</p>':'')+'</details>'+
  '<details data-editorial-notes><summary>Editorial review notes ('+audit.findings.length+')</summary>'+
  audit.findings.map(f=>'<p dir="auto">'+maybeLink('findings',f.id,f.title)+' · '+h(f.status)+'</p>').join('')+
  (!audit.findings.length?'<p>No active structured critique findings recorded.</p>':'')+'</details>'+
  '<p>Story prose and these notes are preserved separately. No automatic name replacement, approval or manuscript editing.</p>':'')+'</details>';
}
