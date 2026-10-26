import {clone,activeEvents,orderEvents} from './dsl-engine.js';
export function moveScene(data,id,targetId=null,position='before',year){
 const next=clone(data),event=next.events.find(e=>e.id===id&&!e.archived);
 if(!event)throw Error('Scene is no longer available. Reload the branch.');
 if(!['before','after'].includes(position))throw Error('Choose before or after.');
 if(year!==null&&(!Number.isInteger(year)||year < -9999||year > 9999))throw Error('Enter a whole year, or leave it blank.');
 const target=targetId?next.events.find(e=>e.id===targetId&&!e.archived):null;
 if(targetId&&(!target||targetId===id))throw Error('Choose a different available scene.');
 if(target&&(target.year??null)!==year)throw Error('The target scene belongs to another year. Choose its year or another target.');
 if((event.year??null)!==year){
  const previous=event.dateLabel||event.date||String(event.year??'Date not set');
  event.notes=(event.notes?event.notes+'\n':'')+'Planning move: previous date '+previous+'. Source chapter unchanged.';
  event.year=year;event.date='';event.precision='unknown';event.dateLabel=year===null?'Date not set':String(year)+' · Exact date needs review';
 }
 const ordered=orderEvents(next).filter(e=>e.id!==id);
 let at=target?ordered.findIndex(e=>e.id===target.id)+(position==='after'?1:0):-1;
 if(at<0){const last=ordered.map((e,i)=>((e.year??null)===year?i:-1)).filter(i=>i>=0).at(-1);at=last===undefined?ordered.length:last+1;}
 ordered.splice(at,0,event);ordered.forEach((e,i)=>{e.order=i+1;});
 return next;
}
// Native desktop dragging; touch users drag only the dedicated grip, leaving page scrolling intact.
export function bindSceneMoves(root,onDrop){
 let dragged=null,timer=null,touch=null,active=false;
 const locate=(target)=>{const card=target?.closest?.('[data-node]'),lane=target?.closest?.('[data-era]');return card||lane;};
 const drop=(target,y)=>{const node=locate(target);if(!dragged||!node)return;const id=node.dataset.node||null;if(id===dragged)return;const lane=node.closest('[data-era]');const rect=id?node.getBoundingClientRect():null;const position=rect&&y>rect.top+rect.height/2?'after':'before';onDrop(dragged,id,lane?.dataset.era,position);};
 root.querySelectorAll('[data-drag-scene]').forEach(grip=>{
  grip.addEventListener('dragstart',e=>{dragged=grip.dataset.dragScene;e.dataTransfer?.setData('text/plain',dragged);root.classList.add('dsl-dragging');});
  grip.addEventListener('dragend',()=>{dragged=null;root.classList.remove('dsl-dragging');});
  grip.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;touch={id:e.pointerId,x:e.clientX,y:e.clientY};timer=setTimeout(()=>{active=true;dragged=grip.dataset.dragScene;grip.setPointerCapture?.(e.pointerId);root.classList.add('dsl-dragging');},300);});
  grip.addEventListener('pointermove',e=>{if(!touch)return;if(!active&&Math.hypot(e.clientX-touch.x,e.clientY-touch.y)>12){clearTimeout(timer);touch=null;}if(active)e.preventDefault();});
  const stop=e=>{clearTimeout(timer);if(active&&e.type==='pointerup')drop(document.elementFromPoint(e.clientX,e.clientY),e.clientY);touch=null;active=false;dragged=null;root.classList.remove('dsl-dragging');};
  grip.addEventListener('pointerup',stop);grip.addEventListener('pointercancel',stop);
 });
 const over=e=>{if(dragged&&locate(e.target)){e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='move';}};
 const onNativeDrop=e=>{if(!dragged)return;e.preventDefault();drop(e.target,e.clientY);dragged=null;root.classList.remove('dsl-dragging');};
 root.addEventListener('dragover',over);root.addEventListener('drop',onNativeDrop);
 return ()=>{root.removeEventListener('dragover',over);root.removeEventListener('drop',onNativeDrop);clearTimeout(timer);dragged=null;touch=null;active=false;};
}
