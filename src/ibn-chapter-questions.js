import chapterOne from './ibn-chapter1-questions.json';
import chapterTwo from './ibn-chapter2-questions.json';

// Draft planning questions. These are NOT manuscript content or approved story decisions.
// The first two chapters are the controlled trial; later chapters await their own grounded blocks.
const packages = new Map([[1,chapterOne],[2,chapterTwo]]);
const fallbackDrafts = new Map();
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const allQuestions = pack => pack.blocks.flatMap(block => block.questions);
const keyFor = (id, number) => 'ibn-chapter-question-draft:v1:' + id + ':' + number;

function readDraft(key) {
  if(fallbackDrafts.has(key)) return fallbackDrafts.get(key);
  try {
    const saved = window.localStorage.getItem(key);
    if(saved) {
      const parsed = JSON.parse(saved);
      if(parsed && typeof parsed === 'object' && parsed.answers && typeof parsed.answers === 'object') {
        fallbackDrafts.set(key,parsed);
        return parsed;
      }
    }
  } catch {}
  const draft = {schema:'ibn-chapter-questions-v1',answers:{},updatedAt:null};
  fallbackDrafts.set(key,draft);
  return draft;
}
function persist(key, draft) {
  fallbackDrafts.set(key,draft);
  try { window.localStorage.setItem(key,JSON.stringify(draft)); return true; } catch { return false; }
}
function rowHTML(q, index) {
  const group = 'ibnq-' + esc(q.id);
  return '<fieldset class="ibnq-question" data-question-id="'+esc(q.id)+'">' +
    '<legend><b>'+String(index+1)+'.</b> '+esc(q.text)+'</legend>' +
    '<div class="ibnq-choices">' +
    q.options.map((choice,i)=>'<label><input type="radio" name="'+group+'" value="'+esc(String(i))+'"><span>'+esc(choice)+'</span></label>').join('') +
    '<label><input type="radio" name="'+group+'" value="other"><span>Other answer</span></label></div>' +
    '<textarea rows="2" data-custom-answer aria-label="Custom answer for question '+String(index+1)+'" placeholder="اكتب اقتراحك المختلف هنا، لو تحب"></textarea>' +
    '</fieldset>';
}
export function ibnChapterQuestionHTML({chapterNumber,chapterTitle,chapterId}) {
  const pack = packages.get(Number(chapterNumber));
  if(!pack || !chapterId) return '';
  const n = allQuestions(pack).length;
  return '<style>' +
    '.ibnq{margin:14px 0 22px;border:1px solid var(--line,#b9a483);border-radius:12px;background:var(--panel,#efe1cc);padding:12px;overflow-wrap:anywhere;color:var(--ink,#273329)}' +
    '.ibnq>summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:44px;cursor:pointer;font:600 15px system-ui,sans-serif;direction:ltr}' +
    '.ibnq>summary::-webkit-details-marker{display:none}.ibnq>summary:after{content:"▾";font-size:18px;color:#55775f}.ibnq[open]>summary:after{content:"▴"}' +
    '.ibnq small,.ibnq .ibnq-help{font:12px/1.55 system-ui,sans-serif;color:var(--muted,#625d4d)}' +
    '.ibnq-header{margin:12px 0;display:grid;grid-template-columns:1fr;gap:6px}.ibnq-controls{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0;direction:ltr}' +
    '.ibnq-controls button{font:12px system-ui,sans-serif;min-height:36px;border-radius:8px;padding:7px 10px;background:#e6d6bf;color:#234738;border:1px solid #ac9576;cursor:pointer}' +
    '.ibnq-controls button.ibnq-primary{background:#214b3a;color:#fff;border-color:#214b3a}' +
    '.ibnq-block{margin:9px 0;border:1px solid #bea88c;border-radius:10px;background:rgba(255,255,255,.2);padding:9px}' +
    '.ibnq-block>summary{min-height:42px;cursor:pointer;font:600 15px/1.5 system-ui,sans-serif;direction:rtl;text-align:start;padding:4px}' +
    '.ibnq-block>summary span{font:12px system-ui,sans-serif;color:#667062;margin-inline:5px}' +
    '.ibnq-question{border:0;border-top:1px solid #bfae97;padding:14px 3px 8px;margin:8px 0 0;min-width:0}' +
    '.ibnq-question legend{padding-top:12px;font:600 16px/1.8 system-ui,sans-serif;direction:rtl;max-width:100%;color:var(--ink,#273329)}' +
    '.ibnq-choices{display:grid;grid-template-columns:1fr;gap:6px;margin:8px 0;direction:rtl}' +
    '.ibnq-choices label{display:flex;align-items:flex-start;gap:8px;border:1px solid #c4b399;border-radius:8px;padding:9px 10px;cursor:pointer;line-height:1.6;min-width:0;background:rgba(255,255,255,.18);font-size:14px}' +
    '.ibnq-choices input{flex:none;width:18px;height:18px;margin:2px 0 0;accent-color:#245640}' +
    '.ibnq-choices label:has(input:checked){border-color:#377456;background:#d6e5d5}' +
    '.ibnq-question textarea{width:100%;max-width:100%;box-sizing:border-box;border:1px solid #b7a487;border-radius:8px;background:#fff9ed;padding:9px;font:16px/1.6 system-ui,sans-serif;min-height:55px;direction:rtl;resize:vertical}' +
    '.ibnq-results{white-space:pre-wrap;line-height:1.7;overflow-wrap:anywhere;padding:10px;border:1px solid var(--line,#b9a483);border-radius:8px;background:rgba(255,255,255,.3);font-size:13px}' +
    '.ibnq-output{box-sizing:border-box;width:100%;max-width:100%;min-height:90px;font:14px/1.6 system-ui,sans-serif;direction:rtl}' +
    '@media(min-width:700px){.ibnq-choices{grid-template-columns:1fr 1fr}}@media print{.ibnq{display:none!important}}' +
    '</style>' +
    '<details class="ibnq" data-ibn-questions data-chapter-id="'+esc(chapterId)+'" data-chapter-number="'+esc(chapterNumber)+'">' +
    '<summary><span>Chapter Questions <small>'+n+' questions · '+pack.blocks.length+' blocks</small></span><span data-ibnq-count>0 answered</span></summary>' +
    '<div class="ibnq-header" dir="ltr"><strong>Chapter '+esc(chapterNumber)+' · '+esc(chapterTitle)+'</strong>' +
    '<p class="ibnq-help">Development questions only. Answers are proposals, not edits to the chapter title, manuscript, or approved canon. Drafts stay on this device until exported.</p>' +
    '<p class="ibnq-help">Motor rule ZK.N01: independent storylines, parallel time, separate character knowledge, gradual connections and consequences.</p></div>' +
    '<div class="ibnq-controls"><button type="button" data-ibnq-open>Open all blocks</button><button type="button" data-ibnq-close>Collapse blocks</button>' +
    '<button type="button" data-ibnq-top>Back to start</button></div>' +
    pack.blocks.map((block,bi)=>'<details class="ibnq-block" '+(bi===0?'open':'')+'><summary>'+String(bi+1)+'. '+esc(block.title)+' <span>10 questions · <b data-ibnq-block-count="'+esc(block.id)+'">0/10</b></span></summary>' +
    block.questions.map((q,qi)=>rowHTML(q,bi*10+qi)).join('')+'</details>').join('') +
    '<div class="ibnq-controls"><button type="button" class="ibnq-primary" data-ibnq-review>Review answers</button>' +
    '<button type="button" data-ibnq-copy>Copy for AI analysis</button>' +
    '<button type="button" data-ibnq-html>Download answers HTML</button>' +
    '<button type="button" data-ibnq-json>Export JSON</button><button type="button" data-ibnq-top>Back to start</button></div>' +
    '<p role="status" class="ibnq-help" data-ibnq-status></p><div class="ibnq-results" data-ibnq-results hidden dir="rtl"></div>' +
    '<textarea class="ibnq-output" data-ibnq-output hidden readonly aria-label="AI analysis text"></textarea>' +
    '</details>';
}
function asRows(pack, draft) {
  return pack.blocks.flatMap(block=>block.questions.map(q=>{
    const response = draft.answers[q.id] || {};
    const selected = response.choice==='other' ? String(response.custom||'').trim() :
      /^\d+$/.test(String(response.choice||'')) ? q.options[Number(response.choice)]||'' : '';
    return {id:q.id,block:block.title,question:q.text,answer:selected,custom:String(response.custom||'').trim(),status:selected===q.options[2]?'deferred':selected?'proposed':'open'};
  }));
}
function download(name,body,type) {
  const blob = new Blob([body],{type});
  const uri = URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=uri;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(uri),5000);
}
function analysisText(rows, pack, title) {
  const answered=rows.filter(r=>r.status==='proposed'),deferred=rows.filter(r=>r.status==='deferred'),open=rows.filter(r=>r.status==='open');
  const groups=pack.blocks.map(b=>{
    const groupRows=rows.filter(r=>r.block===b.title);
    const selected=groupRows.filter(r=>r.status==='proposed');
    return b.title+': '+selected.length+'/10 decided; '+groupRows.filter(r=>r.status==='deferred').length+' deferred; '+groupRows.filter(r=>r.status==='open').length+' open.';
  });
  return 'Chapter '+pack.chapter+' · '+title+'\n'+
    'Draft choices '+answered.length+' / '+rows.length+' · Deferred '+deferred.length+' · Unanswered '+open.length+'\n\n'+
    groups.join('\n')+'\n\n'+
    'Review still required: compare the proposed choices with current approved story decisions and ZK.G00 / ZK.N01. Check parallel scene times, locations, viewpoint, character knowledge, evidence, cause and effect, and compatibility across chapters. Do not mark proposed choices as approved.';
}
function aiPacket(rows,pack,title,sourceRevision) {
  return 'IBN AL JABAL · AUTHOR QUESTION RESPONSE PACKET\n'+
    'Chapter '+pack.chapter+' · '+title+'\nSaved manuscript revision: '+(sourceRevision??'Unknown')+'\nStatus: brainstorming proposals only, NOT approved canon.\n'+
    'Before analysis read https://benji-zk.vercel.app/rules.txt and current approved project decisions. If they are inaccessible, disclose it. Follow ZK.G00 and ZK.N01.\n'+
    'Explain patterns, check parallel storylines and chronology, identify contradictions, assess characters and secrets, and ask only about unresolved consequential choices. Never modify the chapter or treat these answers as approved.\n\n'+
    analysisText(rows,pack,title)+'\n\nQUESTION RESPONSES\n'+
    rows.map(r=>r.id+' | '+r.block+'\nQ: '+r.question+'\nA: '+(r.answer||'[unanswered]')+'\n').join('\n');
}
export function mountIbnChapterQuestions(root,{chapterNumber,chapterTitle,chapterId,revision}) {
  if(!root) return ()=>{};
  const pack=packages.get(Number(chapterNumber));
  if(!pack||!chapterId) return ()=>{};
  const key=keyFor(chapterId,chapterNumber);
  const saved=readDraft(key);
  const draft={...saved,answers:{...saved.answers},chapterTitle,sourceRevision:revision??null,chapterId,chapterNumber};
  const find=(selector)=>root.querySelector(selector);
  for(const node of root.querySelectorAll('[data-question-id]')) {
    const entry=draft.answers[node.dataset.questionId] || {};
    const selected=node.querySelector('input[value="'+String(entry.choice||'')+'"]');
    if(selected)selected.checked=true;
    const other=node.querySelector('[data-custom-answer]');
    if(other)other.value=String(entry.custom||'');
  }
  const refresh=()=>{
    const rows=asRows(pack,draft);
    const done=rows.filter(x=>x.status==='proposed').length;
    const deferred=rows.filter(x=>x.status==='deferred').length;
    const tag=find('[data-ibnq-count]');
    if(tag)tag.textContent=done+' answered · '+deferred+' deferred';
    for(const b of pack.blocks){
      const blockCount=find('[data-ibnq-block-count="'+b.id+'"]');
      if(blockCount)blockCount.textContent=rows.filter(r=>r.block===b.title&&r.status==='proposed').length+'/10';
    }
    return rows;
  };
  const status=s=>{const el=find('[data-ibnq-status]');if(el)el.textContent=s;};
  const listener=(e)=>{
    const node=e.target.closest('[data-question-id]');
    if(!node)return;
    const id=node.dataset.questionId;
    const selected=node.querySelector('input[type="radio"]:checked');
    const custom=node.querySelector('[data-custom-answer]');
    if(e.target===custom && custom.value.trim()){
      const other=node.querySelector('input[value="other"]');if(other)other.checked=true;
    }
    draft.answers[id]={choice:node.querySelector('input[type="radio"]:checked')?.value||'',custom:custom?.value||''};
    draft.updatedAt=new Date().toISOString();
    const written=persist(key,draft);
    refresh();
    status(written?'Draft saved on this device.':'Browser storage unavailable. Export your answers to keep them.');
  };
  root.addEventListener('change',listener);
  root.addEventListener('input',listener);
  find('[data-ibnq-open]')?.addEventListener('click',()=>root.querySelectorAll('.ibnq-block').forEach(el=>el.open=true));
  find('[data-ibnq-close]')?.addEventListener('click',()=>root.querySelectorAll('.ibnq-block').forEach(el=>el.open=false));
  root.querySelectorAll('[data-ibnq-top]').forEach(b=>b.addEventListener('click',()=>root.scrollIntoView({behavior:'smooth',block:'start'})));
  find('[data-ibnq-review]')?.addEventListener('click',()=>{
    const rows=refresh();
    const box=find('[data-ibnq-results]');
    if(box){box.hidden=false;box.textContent=analysisText(rows,pack,chapterTitle);}
    status('Planning summary prepared. Choices still need author review and AI continuity analysis.');
  });
  find('[data-ibnq-copy]')?.addEventListener('click',async()=>{
    const packet=aiPacket(refresh(),pack,chapterTitle,revision);
    try{await navigator.clipboard.writeText(packet);status('Analysis packet copied. Paste it into ChatGPT or another AI for a full review.');}
    catch {const box=find('[data-ibnq-output]');if(box){box.hidden=false;box.value=packet;box.focus();box.select();}status('Copy blocked. Select and copy the text shown below.');}
  });
  find('[data-ibnq-json]')?.addEventListener('click',()=>{
    const body={format:'ibn-chapter-question-proposals-v1',status:'proposed',chapterId,chapterNumber,title:chapterTitle,sourceRevision:revision??null,updatedAt:draft.updatedAt,answers:asRows(pack,draft)};
    download('IbnAlJabal_Chapter'+chapterNumber+'_Answers.json',JSON.stringify(body,null,2),'application/json;charset=utf-8');
    status('Answers JSON exported. The manuscript was not changed.');
  });
  find('[data-ibnq-html]')?.addEventListener('click',()=>{
    const rows=refresh();
    const body='<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(chapterTitle)+' · Answers</title><style>body{max-width:860px;margin:auto;padding:18px;background:#d9c4ab;color:#233b30;font:17px/1.8 system-ui}details{border:1px solid #baa58b;background:#efe1cb;border-radius:12px;padding:12px;margin:12px 0}summary{font-weight:700;cursor:pointer}p{margin:9px 0}small{color:#605e51}</style></head><body><h1>ابن الجبل · الفصل '+chapterNumber+'</h1><h2>'+esc(chapterTitle)+'</h2><p>مقترحات للمراجعة فقط، لا تغيّر الفصل أو القرارات المعتمدة.</p>'+
      pack.blocks.map(block=>'<details open><summary>'+esc(block.title)+'</summary>'+rows.filter(r=>r.block===block.title).map(row=>'<p><strong>'+esc(row.id)+' · '+esc(row.question)+'</strong><br>'+esc(row.answer||'لم يُجب بعد')+'</p>').join('')+'</details>').join('')+'</body></html>';
    download('IbnAlJabal_Chapter'+chapterNumber+'_Answers.html',body,'text/html;charset=utf-8');
    status('Standalone HTML exported with all 100 questions and their answers.');
  });
  refresh();
  return ()=>{root.removeEventListener('change',listener);root.removeEventListener('input',listener);};
}
export function ibnQuestionCounts() {
  return [...packages.entries()].map(([chapter,p])=>({chapter,blocks:p.blocks.length,questions:allQuestions(p).length}));
}
