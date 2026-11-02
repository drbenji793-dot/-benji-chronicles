import {activeRecord} from './current-book-brief.js';
export const isDeferral=value=>/^(أؤجل القرار|defer|deferred)$/i.test(String(value||'').trim());
export const questionState=q=>q.status==='conflict'?'conflict':q.status==='deferred'?'deferred':['applied','resolved','rejected'].includes(q.status)?q.status:q.status==='approved'?'approved':String(q.answer||'').trim()&&!isDeferral(q.answer)||q.status==='answered'?'answered':'open';
export const questionLabel=q=>({open:'Open',answered:'Answer saved',approved:'Approved · pending application',deferred:'Deferred',conflict:'Conflict',applied:'Applied',resolved:'Resolved',rejected:'Rejected'}[questionState(q)]);
export function replaceQuestion(data,id,transform,{allowCreate=false}={}){
 const d=structuredClone(data),rows=d.workshop?.questions||[],index=rows.findIndex(q=>q.id===id);
 if(index<0&&!allowCreate)throw Error('This question is no longer available. Reload the current source.');
 if(index>=0&&!activeRecord(rows[index]))throw Error('This question has been retired. Open the current decision.');
 const next=transform(index<0?null:rows[index]);if(!next||next.id!==id)throw Error('Question identity must be preserved.');
 if(index<0)rows.push(next);else rows[index]=next;
 d.workshop={...(d.workshop||{}),questions:rows};return d;
}
export function saveQuestionAnswer(data,id,{answer,notes,parts,writer,at=new Date().toISOString()}){
 return replaceQuestion(data,id,q=>{
  if(['applied','resolved','approved'].includes(questionState(q)))throw Error('This decision is approved or applied. Create a linked revision instead of overwriting it.');
  if(isDeferral(answer)){q.status='deferred';}else{
   q.answer=answer;q.status=String(answer||'').trim()?'answered':'open';
   if(parts){q.selectedAnswers=parts.selected.filter(v=>!isDeferral(v));q.writtenAnswer=parts.written;q.answerPartsText=answer;}
   for(const key of Object.keys(q.sourceFields||{}))if(/_choice$/.test(key))q.sourceFields[key]=answer;
  }
  if(notes!==undefined){q.answerNotes=notes;for(const key of Object.keys(q.sourceFields||{}))if(/_notes$/.test(key))q.sourceFields[key]=notes;}
  q.updatedBy=writer;q.updatedAt=at;return q;
 });
}
export function editQuestion(data,id,values,{writer,at=new Date().toISOString(),allowCreate=false}={}){
 return replaceQuestion(data,id,old=>{
  const q=old||{id,answer:'',options:[],eventIds:[]},state=questionState(q),next=values.status;
  if(['applied','resolved','approved'].includes(state)&&next!==q.status)throw Error('An approved or applied decision cannot be reopened here. Create a linked revision.');
  if(['applied','resolved','approved'].includes(next)&&next!==q.status)throw Error('Application and approval require a reviewed change.');
  if(!['open','answered','deferred','rejected','conflict','applied','resolved','approved'].includes(next))throw Error('Unknown question status.');
  if(next==='answered'&&(!String(q.answer||'').trim()||isDeferral(q.answer)))throw Error('Save an answer before marking it answered.');
  return {...q,...values,id,updatedBy:writer,updatedAt:at};
 },{allowCreate});
}
