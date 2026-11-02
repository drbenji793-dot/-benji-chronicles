// Undo applies only to unsaved edits in the current mounted chapter.
export function mountChapterUndo(host){
 const copy=host.querySelector('#chronicles-copy,#copy');
 const prose=host.querySelector('#chronicles-entry-body,#prose');
 const title=host.querySelector('#chronicles-entry-title,#title-input');
 if(!copy||!prose||host.querySelector('#chapter-undo'))return;
 const button=document.createElement('button');button.id='chapter-undo';button.type='button';button.textContent='Undo';button.title='Undo the last unsaved edit';copy.after(button);
 const editable=()=>prose.getAttribute('contenteditable')==='true';
 const read=()=>({body:prose.innerHTML,title:title?.value||''});
 const same=(a,b)=>a.body===b.body&&a.title===b.title;
 let last=read(),history=[],restoring=false;
 const sync=()=>{button.disabled=!editable()||!history.length;};
 const baseline=()=>{history=[];last=read();sync();};
 for(const field of [prose,title].filter(Boolean)){
  field.addEventListener('beforeinput',()=>{if(editable())last=read();});
  field.addEventListener('input',()=>{if(restoring||!editable())return;const next=read();if(!same(last,next)){history.push(last);if(history.length>100)history.shift();last=next;}sync();});
 }
 button.addEventListener('pointerdown',e=>e.preventDefault());
 button.onclick=()=>{if(!editable()||!history.length)return;const state=history.pop();restoring=true;prose.innerHTML=state.body;if(title)title.value=state.title;last=read();prose.dispatchEvent(new Event('input',{bubbles:true}));title?.dispatchEvent(new Event('input',{bubbles:true}));restoring=false;sync();};
 new MutationObserver(baseline).observe(prose,{attributes:true,attributeFilter:['contenteditable']});
 sync();
}
