// Use the same selected HTML document for both delivery formats.
export function packagePDFRows(html){
 const doc=new DOMParser().parseFromString(html,'text/html'),rows=[];
 for(const section of doc.body.querySelectorAll(':scope > section')){
  const blocks=section.id==='chapters'?[...section.querySelectorAll(':scope > article')]:[section];
  for(const block of blocks){
   const copy=block.cloneNode(true),heading=copy.querySelector(':scope > h2,:scope > h3');
   const title=heading?.textContent||'Saved content';heading?.remove();
   // Flatten layout wrappers so long source paragraphs can paginate independently.
   const flatten=node=>{
    if(node.nodeType===1&&['SECTION','ARTICLE','DIV'].includes(node.tagName))return [...node.childNodes].map(flatten).join('');
    if(node.nodeType===1)return node.outerHTML;
    const p=doc.createElement('p');p.textContent=node.textContent;return node.textContent.trim()?p.outerHTML:'';
   };
   rows.push({title,body:[...copy.childNodes].map(flatten).join('')});
  }
 }
 if(doc.querySelector('body > section:not(#chapters)')&&rows.length){
  const notice=doc.querySelector('body > p');if(notice)rows[0].body=notice.outerHTML+rows[0].body;
 }
 if(!rows.length)throw Error('No selected content to export.');
 return rows;
}
export const offlinePDFStyles='@media print{.offline-pdf,nav,.technical-details{display:none!important}body{background:white!important;margin:0!important;padding:0!important}article{break-before:page}h2,h3{break-after:avoid}p{orphans:3;widows:3}@page{size:A4;margin:18mm}}';
export const offlinePDFControl='<div class="offline-pdf"><button type="button" onclick="window.print()">Print / Save PDF</button><p>Choose Save as PDF in your browser’s print options.</p></div>';
