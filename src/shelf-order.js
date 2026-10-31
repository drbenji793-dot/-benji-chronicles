export function shelfKey(anchor){
 const p=new URLSearchParams(anchor.hash.slice(1));
 if(p.has('book'))return 'book:'+p.get('book');
 if(p.has('collection'))return 'collection:'+(p.get('lang')||'ar');
 if(p.has('story'))return 'story:'+p.get('story')+':'+(p.get('lang')||'ar');
 return null;
}
export function mergeShelfOrder(visible,stored){return [...visible,...stored.filter(k=>!visible.includes(k))];}
export async function mountShelfOrder(shelf,api){
 if(shelf.querySelector('.shelf-arrange'))return;
 const grid=shelf.querySelector('.library-bookshelf,.collection-grid');if(!grid)return;
 const scope=(shelf.dataset.edition||'ar')+':'+(new URLSearchParams(location.hash.slice(1)).has('collection')?'collection':'library');
 const items=[];
 for(const child of [...grid.children]){
  const a=child.matches('a')?child:child.querySelector('a[href]');if(!a)continue;const key=shelfKey(a);if(!key)continue;
  let item=child;if(child.matches('a')){item=document.createElement('div');item.className='managed-book';child.before(item);item.append(child);}
  item.dataset.shelfKey=key;item.classList.add('shelf-item');items.push(item);
  a.draggable=false;
 }
 if(items.length<2)return;
 const bar=document.createElement('div');bar.className='shelf-arrange';bar.dir='ltr';
 bar.innerHTML='<button type="button" data-arrange aria-pressed="false">Arrange books</button><span role="status" aria-live="polite">Loading saved order…</span><button type="button" data-undo hidden>Undo</button>';
 grid.before(bar);const status=bar.querySelector('[role=status]'),toggle=bar.querySelector('[data-arrange]'),undo=bar.querySelector('[data-undo]');
 let record,prior=null,busy=false,arranging=false,drag=null,pending=null,timer,frame,suppressUntil=0;
 const keys=()=>[...grid.children].map(x=>x.dataset.shelfKey).filter(Boolean);
 const apply=order=>{const all=new Map(items.map(x=>[x.dataset.shelfKey,x]));for(const key of [...order,...keys()]){const el=all.get(key);if(el){grid.append(el);all.delete(key);}}buttons();};
 function buttons(){const order=keys();for(const item of items){const i=order.indexOf(item.dataset.shelfKey);item.querySelector('[data-earlier]')?.toggleAttribute('disabled',busy||i===0);item.querySelector('[data-later]')?.toggleAttribute('disabled',busy||i===order.length-1);}toggle.disabled=busy||!record;undo.disabled=busy;}
 const fetchOrder=async()=>{const rows=await api('chronicles_shelf_order?scope=eq.'+scope+'&select=*');if(!rows[0])throw Error('Saved shelf not available');return rows[0];};
 async function save(before,isUndo=false){
  const next=mergeShelfOrder(keys(),record.order_keys);busy=true;buttons();status.textContent='Saving order…';
  try{const result=await api('rpc/chronicles_save_shelf_order',{method:'POST',body:JSON.stringify({p_scope:scope,p_keys:next,p_revision:record.revision})});record=result;prior=isUndo?null:before;undo.hidden=!prior;status.textContent=isUndo?'Previous order restored':'Order saved';}
  catch(error){apply(before);prior=null;undo.hidden=true;status.textContent='Order not saved. '+error.message;try{record=await fetchOrder();if(grid.isConnected)apply(record.order_keys);}catch{record=null;status.textContent='Order not saved. Reopen the library when connected.';}}
  finally{busy=false;buttons();}
 }
 toggle.onclick=()=>{arranging=!arranging;grid.classList.toggle('arranging',arranging);toggle.textContent=arranging?'Done arranging':'Arrange books';toggle.setAttribute('aria-pressed',String(arranging));status.textContent=arranging?'Drag a cover or use Earlier and Later.':'Hold a cover to move it.';};
 undo.onclick=()=>{if(busy||!prior)return;const before=keys(),restore=prior;apply(restore);save(before,true);};
 for(const item of items){
  const moves=document.createElement('div');moves.className='shelf-moves';moves.innerHTML='<button type="button" data-earlier>← Earlier</button><button type="button" data-later>Later →</button>';item.append(moves);
  const title=item.querySelector('a')?.getAttribute('aria-label')?.replace(/^Open /,'')||'book';
  for(const [attr,delta] of [['data-earlier',-1],['data-later',1]]){const b=moves.querySelector('['+attr+']');b.setAttribute('aria-label','Move '+title+(delta<0?' earlier':' later'));b.onclick=()=>{if(busy||!record)return;const before=keys(),next=[...before],i=next.indexOf(item.dataset.shelfKey),j=i+delta;if(j<0||j>=next.length)return;[next[i],next[j]]=[next[j],next[i]];apply(next);b.focus();save(before);};}
 }
 function clearPending(){clearTimeout(timer);timer=null;pending=null;}
 function start(){
  if(!pending||busy||!record||!grid.isConnected)return;
  const {item,x,y,pointerId}=pending,before=keys(),r=item.getBoundingClientRect();clearPending();if(pointerId!==undefined)grid.setPointerCapture?.(pointerId);
  const ghost=item.cloneNode(true);ghost.className='shelf-drag-ghost';ghost.setAttribute('aria-hidden','true');ghost.style.width=r.width+'px';ghost.style.left=r.left+'px';ghost.style.top=r.top+'px';document.body.append(ghost);
  drag={item,ghost,before,x,y,dx:x-r.left,dy:y-r.top};item.classList.add('shelf-dragging');grid.classList.add('drag-active');status.textContent='Move the cover, then release to place it.';suppressUntil=Date.now()+1000;frame=requestAnimationFrame(tick);
 }
 function move(x,y){
  if(!drag)return;drag.x=x;drag.y=y;drag.ghost.style.left=(x-drag.dx)+'px';drag.ghost.style.top=(y-drag.dy)+'px';
  const target=document.elementFromPoint(x,y)?.closest('.shelf-item');if(!target||target===drag.item||target.parentElement!==grid)return;
  const order=[...grid.children],from=order.indexOf(drag.item),to=order.indexOf(target);grid.insertBefore(drag.item,from<to?target.nextSibling:target);buttons();
 }
 function tick(){if(!drag)return;if(!grid.isConnected){finish(false);return;}const y=drag.y,h=window.innerHeight;if(y<70)window.scrollBy(0,-10);else if(y>h-70)window.scrollBy(0,10);move(drag.x,drag.y);frame=requestAnimationFrame(tick);}
 function finish(commit=true){
  clearPending();if(!drag)return;cancelAnimationFrame(frame);const d=drag;drag=null;d.ghost.remove();d.item.classList.remove('shelf-dragging');grid.classList.remove('drag-active');suppressUntil=Date.now()+700;
  if(!commit){apply(d.before);status.textContent='Move canceled';return;}
  if(keys().join('|')===d.before.join('|')){status.textContent='Order unchanged';return;}save(d.before);
 }
 function begin(target,x,y){if(busy||!record||target.closest('button,summary,details,input'))return;const a=target.closest('a');const item=a?.closest('.shelf-item');if(!item||item.parentElement!==grid)return;pending={item,x,y};timer=setTimeout(start,arranging?120:450);}
 grid.addEventListener('touchstart',e=>{if(e.touches.length!==1){finish(false);return;}const t=e.touches[0];begin(e.target,t.clientX,t.clientY);},{passive:true});
 grid.addEventListener('touchmove',e=>{if(e.touches.length!==1){finish(false);return;}const t=e.touches[0];if(drag){e.preventDefault();move(t.clientX,t.clientY);}else if(pending&&Math.hypot(t.clientX-pending.x,t.clientY-pending.y)>10)clearPending();},{passive:false});
 grid.addEventListener('touchend',()=>finish(true));grid.addEventListener('touchcancel',()=>finish(false));
 grid.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;begin(e.target,e.clientX,e.clientY);if(pending){clearTimeout(timer);pending.pointerId=e.pointerId;}});
 grid.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;if(pending&&Math.hypot(e.clientX-pending.x,e.clientY-pending.y)>6)start();if(drag){e.preventDefault();move(e.clientX,e.clientY);}});
 grid.addEventListener('pointerup',e=>{if(e.pointerType==='mouse')finish(true);});grid.addEventListener('pointercancel',()=>finish(false));
 grid.addEventListener('dragstart',e=>e.preventDefault());grid.addEventListener('contextmenu',e=>{if(e.target.closest('.shelf-item>a'))e.preventDefault();});
 grid.addEventListener('click',e=>{if(Date.now()<suppressUntil||arranging&&e.target.closest('.shelf-item>a')){e.preventDefault();e.stopImmediatePropagation();}},true);
 grid.addEventListener('keydown',e=>{if(e.key==='Escape')finish(false);});
 buttons();try{record=await fetchOrder();if(!grid.isConnected)return;apply(record.order_keys);status.textContent='Hold a cover to move it.';}catch{status.textContent='Arrange unavailable. Reopen the library when connected.';}buttons();
}
