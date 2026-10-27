// Book media is archived here during the same task that creates or changes it.
// Keep previous files and entries when selecting a new cover. See rules/Book_Media_References_Rule.md.
const archive={
  '43d580d7-a4bd-4d19-bd1c-0cad57b2e105':[
    {id:'original-artwork',title:'Original artwork',type:'image',url:'/artwork/angels-and-robots-original-reference.webp',source:'Original artwork supplied by Benji',date:'Received 27 October 2026; original creation date unknown',version:'Original reference',original:'https://chatgpt.com/library?file_id=libfile_947bc65eb2788191b11ada3f075bedea&account_id=personal'},
    {id:'developed-cover-v1',title:'Developed cover artwork',type:'image',url:'/artwork/angels-and-robots-cover-v1.webp',source:'Developed from Benji’s original using image generation',date:'27 October 2026',version:'Version 1'}
  ]
};
export function renderBookMedia(bookId,cover,esc){
  const items=[...(archive[bookId]||[])];
  if(cover?.image&&!items.some(m=>m.url===cover.image))items.push({id:'selected-cover',title:'Selected cover artwork',type:'image',url:cover.image,version:'Current cover',source:'Book artwork registry'});
  if(!items.length)return '<p class="reference-note">No media has been registered for this book yet. Images, audio, video and earlier versions belong here when developed.</p>';
  return '<div class="book-media-grid">'+items.map(m=>{
    const current=m.url===cover?.image;
    const preview=m.type==='image'?`<a href="${esc(m.url)}" target="_blank" rel="noopener"><img src="${esc(m.url)}" alt="${esc(m.title)}" loading="lazy"></a>`:m.type==='audio'?`<audio controls preload="metadata" src="${esc(m.url)}"></audio>`:m.type==='video'?`<video controls preload="metadata" src="${esc(m.url)}"></video>`:'';
    return `<figure class="book-media-card">${preview}<figcaption><h3>${esc(m.title)}</h3><p>${esc(m.version||'')}${current?' · Selected cover':''}</p><p>${esc(m.source||'Source not recorded')}</p>${m.date?`<p>${esc(m.date)}</p>`:''}<a href="${esc(m.url)}" target="_blank" rel="noopener">Open media</a>${m.original?` · <a href="${esc(m.original)}" target="_blank" rel="noopener">Original upload</a>`:''}</figcaption></figure>`;
  }).join('')+'</div>';
}
