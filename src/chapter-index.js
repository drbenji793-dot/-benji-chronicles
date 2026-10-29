// Shared first-page chapter chooser. Reading a book never changes its manuscript.
export function chapterCards(rows,{esc,root,date,language='ar',empty='No chapters yet.'}){
 const list=[...rows].sort((a,b)=>a.chapter_number-b.chapter_number);
 return `<h2>Chapters <small>(${list.length})</small></h2>`+(list.length?'<div class="chronicles-chapter-cards">'+list.map(c=>`<a class="chronicles-chapter-card" href="${root}&chapter=${c.chapter_number}"><strong>Chapter ${c.chapter_number} · <span dir="auto">${esc(c.title)}</span></strong>${c.wordCount!==undefined?`<small>${c.wordCount} كلمة · ${esc(c.statusLabel||'مسودة')}</small>`:''}<small dir="ltr">Revision ${c.revision||1}${c.updated_by?' · '+esc(c.updated_by):''}${c.updated_at?' · '+date(c.updated_at):''}</small></a>`).join('')+'</div>':`<div class="guide-card"><p>${esc(empty)}</p></div>`);
}

