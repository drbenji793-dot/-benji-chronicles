import {chapterMetrics} from './chapter-details.js';
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
 if(stamp){
   const english=document.documentElement.lang==='en';
   website.innerHTML=english ? "<div class=\"uni005-release\" dir=\"ltr\"><p>Version 284 · Released 27 November 2026 · 00:36 UTC</p><p>Last lock · v278 (design) · 4688b4b0</p><p data-connections data-origin=\"https://benji-chronicles-english.vercel.app\" style=\"display:flex;flex-wrap:wrap;gap:4px 12px\"><span role=\"img\" data-service=\"github\" aria-label=\"GitHub · unverified\"><i aria-hidden=\"true\" style=\"display:inline-block;width:7px;height:7px;border:1px solid currentColor;border-radius:100%;margin-right:4px\"></i>GitHub</span><span role=\"img\" data-service=\"vercel\" aria-label=\"Vercel · unverified\"><i aria-hidden=\"true\" style=\"display:inline-block;width:7px;height:7px;border:1px solid currentColor;border-radius:100%;margin-right:4px\"></i>Vercel</span><span role=\"img\" data-service=\"supabase\" aria-label=\"Supabase · unverified\"><i aria-hidden=\"true\" style=\"display:inline-block;width:7px;height:7px;border:1px solid currentColor;border-radius:100%;margin-right:4px\"></i>Supabase</span></p><p><a href=\"https://benji-chronicles-english.vercel.app/latest.html\" download>Download latest HTML · Chronicles English</a></p></div>" : "<div class=\"uni005-release\" dir=\"ltr\"><p>Version 284 · Released 27 November 2026 · 00:36 UTC</p><p>Last lock · v278 (design) · 4688b4b0</p><p data-connections data-origin=\"https://benji-chronicles.vercel.app\" style=\"display:flex;flex-wrap:wrap;gap:4px 12px\"><span role=\"img\" data-service=\"github\" aria-label=\"GitHub · unverified\"><i aria-hidden=\"true\" style=\"display:inline-block;width:7px;height:7px;border:1px solid currentColor;border-radius:100%;margin-right:4px\"></i>GitHub</span><span role=\"img\" data-service=\"vercel\" aria-label=\"Vercel · unverified\"><i aria-hidden=\"true\" style=\"display:inline-block;width:7px;height:7px;border:1px solid currentColor;border-radius:100%;margin-right:4px\"></i>Vercel</span><span role=\"img\" data-service=\"supabase\" aria-label=\"Supabase · unverified\"><i aria-hidden=\"true\" style=\"display:inline-block;width:7px;height:7px;border:1px solid currentColor;border-radius:100%;margin-right:4px\"></i>Supabase</span></p><p><a href=\"https://benji-chronicles.vercel.app/latest.html\" download>Download latest HTML · Chronicles Arabic</a></p></div>";
 }
 release.remove();
 const footerControls=document.createElement('div');
 footerControls.className='uni-footer';
 footerControls.innerHTML='<button class="uni-top" type="button" aria-label="Back to top"><svg aria-hidden="true" viewBox="0 0 32 42" width="22" height="29" fill="currentColor"><path d="M2 16 16 0 30 16H21V28H11V16Z"/><rect x="11" y="31" width="10" height="3" rx="1.5"/><rect x="11" y="37" width="10" height="3" rx="1.5"/></svg></button><div class="uni-line" aria-hidden="true"></div>';
 footerControls.querySelector('button').onclick=()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 let panel;const entries=[];let metrics;
 const observer=new MutationObserver(refresh);
 function refresh(){
  observer.disconnect();
  if(!panel?.isConnected){
   panel=document.createElement('details');panel.className='technical-details uni-rec';panel.dataset.pageTechnical='';panel.dataset.uniFooter='';panel.dir='ltr';
   panel.innerHTML='<summary><span class="uni-chip">Technicals</span></summary>';
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
  const wordCount=chapter&&host.querySelector('.chapter-word-count');
  if(wordCount&&!panel.contains(wordCount))panel.append(wordCount);
  if(chapter){
   if(!metrics?.isConnected){metrics=document.createElement('section');metrics.className='chapter-detail-group chapter-numbers';metrics.innerHTML='<h3>Chapter numbers</h3><div data-count-slot></div><p data-extra-counts></p>';panel.append(metrics);}
   if(wordCount&&wordCount.parentElement!==metrics.querySelector('[data-count-slot]'))metrics.querySelector('[data-count-slot]').append(wordCount);
   const counts=chapterMetrics(chapter),value=counts.characters.toLocaleString('en-US')+' characters · '+counts.paragraphs+' paragraphs';
   const wordTarget=wordCount?.querySelector('#word-count')||wordCount;const wordLabel=counts.words.toLocaleString('en-US')+' words';if(wordTarget&&wordTarget.textContent!==wordLabel)wordTarget.textContent=wordLabel;
   if(metrics.querySelector('[data-extra-counts]').textContent!==value)metrics.querySelector('[data-extra-counts]').textContent=value;
   const activity=panel.querySelector('.chapter-stamp')||panel.querySelector('.technical-section');
   if(activity&&activity.nextElementSibling!==metrics)activity.after(metrics);
  }else if(metrics){metrics.remove();metrics=null;}
  // Edition navigation belongs outside the chapter metadata rectangle.
  if(editionBridge&&editionBridge.nextElementSibling!==footer)footer.before(editionBridge);
  const summary=panel.firstElementChild;
  if(summary.nextElementSibling!==website)summary.after(website);
  website.className='chapter-detail-group website-details';
  if(host.lastElementChild!==panel)host.append(panel);
  if(panel.previousElementSibling!==footerControls)panel.before(footerControls);
  observer.observe(main,{childList:true,subtree:true,characterData:true});
 }
 refresh();return ()=>observer.disconnect();
}
