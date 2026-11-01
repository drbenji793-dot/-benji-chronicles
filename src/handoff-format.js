import {technicalPanel} from './revision-stamp.js';
// Reader-facing planning export. Unrecognised fields remain available, collapsed.
export function handoffText(value, esc) {
  if(value==null || value==='')return '';
  if(Array.isArray(value))return value.map(v=>handoffText(v,esc)).join('');
  if(typeof value!=='object')return '<p dir="auto">'+esc(String(value))+'</p>';
  const labels={summary:'Summary',description:'Description',text:'Text',body:'Text',content:'Content',treatment:'Treatment',synopsis:'Synopsis',outcome:'Outcome',status:'Status',developmentStatus:'Development status',notes:'Notes',comments:'Comments',points:'Key points',motivation:'Motivation',goal:'Goal',role:'Role',relationships:'Relationships',traits:'Traits',backstory:'Background',conflict:'Conflict',rules:'Rules'};
  const title=value.title||value.name||value.label;
  const date=value.dateLabel||value.date||value.year;
  let html=title?'<h4 dir="auto">'+esc(String(title))+'</h4>':'';
  const context=[date,value.location].filter(v=>v!=null&&v!=='').map(v=>esc(String(v)));
  if(context.length)html+='<p class="event-context" dir="auto">'+context.join(' · ')+'</p>';
  for(const [key,label] of Object.entries(labels)){
    if(value[key]==null||value[key]===''||(Array.isArray(value[key])&&!value[key].length))continue;
    html+='<div class="planning-field"><strong>'+label+'</strong>'+handoffText(value[key],esc)+'</div>';
  }
  const consumed=new Set(['title','name','label','dateLabel','date','year','location',...Object.keys(labels)]);
  const extra=Object.fromEntries(Object.entries(value).filter(([k,v])=>!consumed.has(k)&&v!=null&&v!==''));
  if(Object.keys(extra).length)html+=technicalPanel('<pre dir="auto">'+esc(JSON.stringify(extra,null,2))+'</pre>');
  return html?'<article class="planning-record">'+html+'</article>':'';
}
export const handoffCSS=`*{box-sizing:border-box}body{max-width:850px;margin:24px auto;padding:20px;background:#f5ecdf;color:#29362e;font:18px/1.7 Georgia,serif}section{margin:32px 0}article{margin:24px 0}nav{display:flex;flex-wrap:wrap;gap:12px}img{max-width:100%;height:auto}p{white-space:pre-wrap;margin:8px 0;overflow-wrap:anywhere}h1,h2,h3,h4{line-height:1.35;overflow-wrap:anywhere}h4{font-size:1.15em;margin:0 0 8px}.planning-record{border-block-end:1px solid #cbbda8;padding:0 0 18px;margin:18px 0}.event-context{font-size:.9em}.planning-field{margin:10px 0}.planning-field>strong{font:600 .8em/1.4 system-ui,sans-serif}.planning-field>p{margin:3px 0}details{font-size:.85em;margin:12px 0}summary{cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;max-width:100%;font:13px/1.5 monospace}.technical-details{background:rgba(110,110,110,.08);border:1px solid rgba(110,110,110,.22);border-radius:8px;padding:0;font:12px/1.5 system-ui,sans-serif;overflow-wrap:anywhere}.technical-details>summary{display:flex;justify-content:space-between;align-items:center;padding:9px 12px;list-style:none}.technical-details>summary::-webkit-details-marker{display:none}.technical-details[open]>summary span{transform:rotate(180deg)}.technical-details>p,.technical-details>pre{margin:10px 12px;font-size:12px} @media(max-width:600px){body{margin:0;padding:18px;font-size:17px}h1{font-size:1.7em}h2{font-size:1.4em}}`;
