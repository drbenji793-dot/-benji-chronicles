import {formatTime} from './revision-stamp.js';
export function chapterBottomControls({rules=false,previous=false,next=false}={}){
 return `<nav class="chapter-bottom-controls" aria-label="Chapter editing and navigation" dir="ltr">
  ${rules?'':`<button id="bottom-prev" aria-label="Previous chapter" ${previous?'':'disabled'}>‹</button>`}
  <button id="bottom-edit">Edit</button><button id="bottom-save" class="primary" disabled>Save</button>
  ${rules?'':`<button id="bottom-next" aria-label="Next chapter" ${next?'':'disabled'}>›</button>`}
 </nav>`;
}
// Consolidate page metadata without changing saved content or cloning live controls.
export function mountTechnicalFooter(main,footer){
 if(!main||!footer)return;
 const editionBridge=footer.parentElement.querySelector(':scope > .edition-bridge');
 const release=footer.querySelector('.technical-details');
 if(!release)return;
 const website=document.createElement('div');website.dataset.websiteDetails='';
 website.append(...[...release.childNodes].filter(n=>n.nodeName!=='SUMMARY'));
 const stamp=website.textContent.match(/Reader v(\d+) · (\S+) · UTC/);
 if(stamp)website.textContent='Website version: '+stamp[1]+' · Released: '+formatTime(stamp[2]);
 release.remove();
 let panel;const entries=[];
 const observer=new MutationObserver(refresh);
 function refresh(){
  observer.disconnect();
  if(!panel?.isConnected){
   panel=document.createElement('details');panel.className='technical-details';panel.dataset.pageTechnical='';panel.dir='ltr';
   panel.innerHTML='<summary>Technical details <span aria-hidden="true">⌄</span></summary>';
  }
  for(let i=entries.length-1;i>=0;i--)if(!entries[i].anchor.isConnected){entries[i].content.remove();entries.splice(i,1);}
  const host=main.querySelector('.editor-area')||main;
  const chapter=host.querySelector('#chronicles-entry-body,#prose');
  for(const source of [...main.querySelectorAll('details.technical-details')]){
   if(source===panel||panel.contains(source))continue;
   const card=source.closest('.goe-card,.goe-life-section,.planning-record,.critique-report,dialog');
   if(card){if(card.lastElementChild!==source)card.append(source);continue;}
   const anchor=document.createElement('details');anchor.dataset.technicalAnchor='';anchor.className='chapter-secondary-tools';anchor.dir='ltr';
   // Keep actions under their original delegated event handlers. Only metadata moves.
   const hasChapterStamp=!!source.closest('.editor-area')?.querySelector('.chapter-stamp');
   const chapterTools=chapter&&source.classList.contains('reading-details');
   const controls=[...source.querySelectorAll('form,button,a,input,select,textarea')];
   for(const control of controls){if(!source.contains(control)||control.closest('.chapter-stamp'))continue;const wrapper=((hasChapterStamp||chapterTools)&&control.closest('.workflow-panel'))||control.closest('fieldset')||control.closest('form')||control.closest('label')||control;anchor.append(wrapper);}
   anchor.hidden=!chapterTools&&!anchor.childNodes.length;
   if(!anchor.hidden){const summary=document.createElement('summary');summary.textContent=hasChapterStamp||chapterTools?'Chapter tools':'Writing settings and tools';anchor.prepend(summary);}
   const notes=(hasChapterStamp||chapterTools)&&host.querySelector('.chapter-notes');
   if(notes){notes.after(anchor);source.remove();}else source.replaceWith(anchor);
   const content=document.createElement('div');content.className='technical-section';
   content.append(...[...source.childNodes].filter(n=>n.nodeName!=='SUMMARY'));
   entries.push({anchor,content});panel.append(content);
  }
  const workflow=main.querySelector('.library-workflow');
  if(workflow&&!panel.contains(workflow)){const anchor=document.createElement('span');anchor.hidden=true;workflow.before(anchor);entries.push({anchor,content:workflow});panel.append(workflow);}
  const wordCount=chapter&&host.querySelector('.chapter-word-count');
  if(wordCount&&!panel.contains(wordCount))panel.append(wordCount);
  if(editionBridge){
   if(chapter&&panel.lastElementChild!==editionBridge)panel.append(editionBridge);
   else if(!chapter&&editionBridge.nextElementSibling!==footer)footer.before(editionBridge);
  }
  const bridgeInPanel=editionBridge?.parentElement===panel?editionBridge:null;
  if(website.parentElement!==panel||website.nextElementSibling!==bridgeInPanel)panel.insertBefore(website,bridgeInPanel);
  if(host.lastElementChild!==panel)host.append(panel);
  observer.observe(main,{childList:true,subtree:true});
 }
 refresh();return ()=>observer.disconnect();
}
