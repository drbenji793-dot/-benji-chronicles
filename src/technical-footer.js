import {formatTime} from './revision-stamp.js';
// Consolidate page metadata without changing saved content or cloning live controls.
export function mountTechnicalFooter(main,footer){
 if(!main||!footer)return;
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
  for(const source of [...main.querySelectorAll('details.technical-details')]){
   if(source===panel||panel.contains(source))continue;
   const card=source.closest('.goe-card,.goe-life-section,.planning-record,.critique-report,dialog');
   if(card){if(card.lastElementChild!==source)card.append(source);continue;}
   const anchor=document.createElement('div');anchor.dataset.technicalAnchor='';
   // Keep actions under their original delegated event handlers. Only metadata moves.
   const controls=[...source.querySelectorAll('form,button,a,input,select,textarea')];
   for(const control of controls){if(!source.contains(control))continue;const wrapper=control.closest('form,label,fieldset')||control;anchor.append(wrapper);}
   anchor.hidden=!anchor.childNodes.length;
   source.replaceWith(anchor);
   const content=document.createElement('div');content.className='technical-section';
   content.append(...[...source.childNodes].filter(n=>n.nodeName!=='SUMMARY'));
   entries.push({anchor,content});panel.append(content);
  }
  panel.append(website);if(main.lastElementChild!==panel)main.append(panel);
  observer.observe(main,{childList:true,subtree:true});
 }
 refresh();return ()=>observer.disconnect();
}
