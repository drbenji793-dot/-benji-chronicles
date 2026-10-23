const authorClass=el=>['author-ahmed','author-benji','author-guest'].find(c=>el?.classList?.contains(c));
export function normalizeAuthorSpans(root){
 // One inline run per author preserves Arabic shaping and avoids per-letter nesting.
 for(const span of [...root.querySelectorAll('span')].reverse()){
  const cls=authorClass(span);if(!cls)continue;
  if(authorClass(span.parentElement)===cls)span.replaceWith(...span.childNodes);
 }
 root.normalize();
 for(const span of [...root.querySelectorAll('span')]){
  const cls=authorClass(span);if(!cls||!root.contains(span))continue;
  while(span.nextSibling?.nodeType===1&&span.nextSibling.tagName==='SPAN'&&authorClass(span.nextSibling)===cls){const next=span.nextSibling;span.append(...next.childNodes);next.remove();}
 }
 root.normalize();
}
export function normalizeAuthorHTML(html){const root=document.createElement('div');root.innerHTML=html;normalizeAuthorSpans(root);return root.innerHTML;}
export function trackAuthors(el,getWriter,onChange){
 let previous=el.textContent,composing=false;
 const offset=(node,n)=>{const r=document.createRange();r.selectNodeContents(el);r.setEnd(node,n);return r.toString().length};
 function point(pos){const walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node,last;while(node=walk.nextNode()){last=node;if(pos<=node.length)return [node,pos];pos-=node.length}return last?[last,last.length]:[el,0]}
 function annotate(e){if(composing||e.isComposing)return;const now=el.textContent;
 if(e.inputType==='historyUndo'||e.inputType==='historyRedo'){previous=now;onChange();return}
 let start=0;while(start<previous.length&&start<now.length&&previous[start]===now[start])start++;
 let oldEnd=previous.length,end=now.length;while(oldEnd>start&&end>start&&previous[oldEnd-1]===now[end-1]){oldEnd--;end--}
 if(end>start){const sel=window.getSelection();let anchor,focus;if(sel.rangeCount&&el.contains(sel.anchorNode)&&el.contains(sel.focusNode)){anchor=offset(sel.anchorNode,sel.anchorOffset);focus=offset(sel.focusNode,sel.focusOffset)}
 const walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),parts=[];let node,pos=0;while(node=walk.nextNode()){const next=pos+node.length;if(next>start&&pos<end)parts.push([node,Math.max(0,start-pos),Math.min(node.length,end-pos)]);pos=next}
 for(const [text,a,b] of parts){const r=document.createRange();r.setStart(text,a);r.setEnd(text,b);const span=document.createElement('span');span.className=getWriter()==='Ahmed'?'author-ahmed':getWriter()==='Guest'?'author-guest':'author-benji';r.surroundContents(span)}
 normalizeAuthorSpans(el);
 if(anchor!==undefined){const [an,ao]=point(anchor),[fn,fo]=point(focus);sel.setBaseAndExtent(an,ao,fn,fo)}
 }
 previous=now;onChange();
 }
 el.oncompositionstart=()=>{composing=true};el.oncompositionend=()=>{composing=false;annotate({})};el.oninput=annotate;
}
