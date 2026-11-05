// Mandatory shared navigation for existing and future book routes.
export function bookNavigation(root, selected, chaptersURL=root, notesView='decisions') {
 const tabs=[['brief','Story',root+'&view=dsl&dslview=synopsis'],['chapters','Chapters',chaptersURL],['critique','Review',root+'&view=critique']];
 return tabs.map(([id,label,href])=>'<a data-book-tool="'+id+'" href="'+href+'" class="'+(id==='garden'?'garden-entrance ':'')+(selected===id?'selected':'')+'"'+(selected===id?' aria-current="page"':'')+'>'+label+'</a>').join('');
}
export function selectedBookTool(params){
 if(params.has('chapter'))return 'chapters';
 if(params.get('view')==='dsl')return 'brief';
 return params.get('view')||'chapters';
}
