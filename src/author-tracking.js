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
 for(const [text,a,b] of parts){const r=document.createRange();r.setStart(text,a);r.setEnd(text,b);const span=document.createElement('span');span.className=getWriter()==='Ahmed'?'author-ahmed':'author-benji';r.surroundContents(span)}
 if(anchor!==undefined){const [an,ao]=point(anchor),[fn,fo]=point(focus);sel.setBaseAndExtent(an,ao,fn,fo)}
 }
 previous=now;onChange();
 }
 el.oncompositionstart=()=>{composing=true};el.oncompositionend=()=>{composing=false;annotate({})};el.oninput=annotate;
}
