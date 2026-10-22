// Keep one browser entry per route, including its reading position and expanded UI.
export function createNavigation({ render, allowLeave, leave, onError }) {
 const key='chroniclesNavigation';
 let active=history.state?.[key]||{index:0,id:crypto.randomUUID(),x:0,y:0,hash:location.hash};
 let loading=false,repairing=false,scrollTimer;
 const state=()=>history.state?.[key];
 const replace=entry=>history.replaceState({...history.state,[key]:entry},'');
 replace(active);history.scrollRestoration='manual';
 function remember(){
  if(loading||repairing||state()?.id!==active.id)return;
  active={...active,x:scrollX,y:scrollY,guideOpen:!!document.querySelector('#guide-content:not([hidden])'),details:[...document.querySelectorAll('#main details')].map(el=>el.open)};replace(active);
 }
 async function display(entry){
  loading=true;active=entry;
  try{await render();
   if(state()?.id===entry.id){active={...entry,hash:location.hash};replace(active);}
   if(entry.guideOpen){const gate=document.querySelector('.guide-gate'),guide=document.querySelector('#guide-content');if(gate&&guide){gate.hidden=true;guide.hidden=false;}}
   document.querySelectorAll('#main details').forEach((el,i)=>el.open=!!entry.details?.[i]);
   await document.fonts.ready;
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   if(state()?.id===entry.id)window.scrollTo(entry.x||0,entry.y||0);
  }catch(e){onError(e)}finally{loading=false;}
 }
 async function navigate(hash){
  hash=hash==='#'?'':hash;
  if(loading||repairing||hash===location.hash)return;
  if(!allowLeave())return;
  remember();leave();
  const next={index:active.index+1,id:crypto.randomUUID(),hash,x:0,y:0};
  history.pushState({[key]:next},'',location.pathname+location.search+hash);
  await display(next);
 }
 function traverse(delta){if(loading||repairing||document.querySelector('dialog[open]'))return;remember();history.go(delta);}
 async function popped(){
  const target=state();
  if(repairing){repairing=false;window.scrollTo(active.x||0,active.y||0);return;}
  if(target?.id===active.id)return;
  if(!target){ // A manually entered fragment gets its own managed entry.
   const next={index:active.index+1,id:crypto.randomUUID(),hash:location.hash,x:0,y:0};replace(next);return popped();
  }
  if(loading||!allowLeave()){
   const delta=active.index-target.index;
   if(delta){repairing=true;history.go(delta);}return;
  }
  leave();await display(target);
 }
 window.addEventListener('popstate',popped);
 window.addEventListener('hashchange',()=>{if(!repairing&&state()?.hash!==location.hash)popped();});
 window.addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(remember,80)},{passive:true});
 window.addEventListener('pagehide',remember);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)remember()});
 document.addEventListener('click',e=>{
  const a=e.target.closest('a[href]');if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target||a.hasAttribute('download'))return;
  const url=new URL(a.href,location.href);
  if(url.origin!==location.origin||url.pathname!==location.pathname||url.search!==location.search)return;
  if(url.hash==='#main')return;
  if(url.hash&&!/^#(?:references|storyline|characters|writing-rules|lang=ar&chapter=\d+|book=[0-9a-f-]{36}(?:&(chapter=\d+|rules=1))?)$/i.test(url.hash))return;
  e.preventDefault();navigate(url.hash);
 });
 // Leave edge gestures to iOS/Safari so a native swipe never causes two traversals.
 let touch=null;
 const blocked=target=>!!target.closest('input,textarea,select,button,a,[contenteditable="true"],dialog,.export-chapters')||!!document.querySelector('dialog[open]')||!!window.getSelection()?.toString();
 document.addEventListener('touchstart',e=>{
  touch=null;if(e.touches.length!==1||loading||repairing||blocked(e.target))return;
  const p=e.touches[0];if(p.clientX<25||p.clientX>innerWidth-25)return;
  touch={x:p.clientX,y:p.clientY,time:performance.now(),horizontal:false};
 },{passive:true});
 document.addEventListener('touchmove',e=>{
  if(!touch)return;if(e.touches.length!==1){touch=null;return;}
  const p=e.touches[0],dx=p.clientX-touch.x,dy=p.clientY-touch.y;
  if(!touch.horizontal&&Math.abs(dy)>15&&Math.abs(dy)>=Math.abs(dx)){touch=null;return;}
  if(Math.abs(dx)>20&&Math.abs(dx)>Math.abs(dy)*1.7){touch.horizontal=true;if(e.cancelable)e.preventDefault();}
 },{passive:false});
 document.addEventListener('touchend',e=>{
  const start=touch;touch=null;if(!start||e.touches.length||!e.changedTouches.length)return;
  const p=e.changedTouches[0],dx=p.clientX-start.x,dy=p.clientY-start.y;
  if(start.horizontal&&Math.abs(dx)>=85&&Math.abs(dx)>Math.abs(dy)*1.7&&performance.now()-start.time<1000)traverse(dx>0?-1:1);
 },{passive:true});
 document.addEventListener('touchcancel',()=>touch=null,{passive:true});
 return {navigate,start:()=>display(active)};
}
