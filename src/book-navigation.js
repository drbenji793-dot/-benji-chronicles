// Mandatory shared navigation for existing and future book routes.
export function bookNavigation(root, selected, chaptersURL=root, notesView='decisions') {
 const tabs=[['brief','Story',root+'&view=brief'],['chapters','Chapters',chaptersURL],['garden','Story World',root+'&view=dsl&dslview=garden'],['critique','Review',root+'&view=critique']];
 return tabs.map(([id,label,href])=>'<a data-book-tool="'+id+'" href="'+href+'" class="'+(id==='garden'?'garden-entrance ':'')+(selected===id?'selected':'')+'"'+(selected===id?' aria-current="page"':'')+'>'+label+'</a>').join('');
}
export function selectedBookTool(params){
 if(params.has('chapter'))return 'chapters';
 if(params.get('dslview')==='garden')return 'garden';
 if(params.get('view')==='dsl')return 'garden';
 return params.get('view')||'chapters';
}
