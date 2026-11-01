// Revision bodies stay outside the history list and load only on request.
export function mountResourceHistory({root,api,story,language,kind,esc,date}){
 const scope=`chronicles_resource_versions?story_number=eq.${encodeURIComponent(story)}&language=eq.${encodeURIComponent(language)}&kind=eq.${encodeURIComponent(kind)}`;
 root.innerHTML='<p>Choose a revision to read. Current information is unchanged.</p><div data-revisions></div><p role="status" data-history-status></p><button data-more>Load revisions</button>';
 const list=root.querySelector('[data-revisions]'),status=root.querySelector('[data-history-status]'),more=root.querySelector('[data-more]');
 let cursor=null,busy=false;
 async function load(){
  if(busy||!list.isConnected)return;busy=true;more.disabled=true;status.textContent='Loading revisions…';
  try{
   const rows=await api(scope+'&select=revision,saved_by,saved_at&order=revision.desc&limit=30'+(cursor===null?'':'&revision=lt.'+cursor));
   if(!list.isConnected)return;
   for(const row of rows){
    const item=document.createElement('details');
    item.innerHTML=`<summary>Revision ${esc(row.revision)} · ${esc(row.saved_by)} · ${esc(date(row.saved_at))}</summary><div data-body></div>`;
    const body=item.querySelector('[data-body]');let loaded=false,loading=false;
    async function read(){
     if(loaded||loading||!item.isConnected)return;loading=true;body.textContent='Loading saved text…';
     try{
      const found=await api(scope+'&revision=eq.'+encodeURIComponent(row.revision)+'&select=body&limit=1');
      if(!item.isConnected)return;if(!found[0])throw Error('Revision unavailable.');
      const pre=document.createElement('pre');pre.dir='auto';pre.style.whiteSpace='pre-wrap';pre.style.overflowWrap='anywhere';pre.textContent=found[0].body;body.replaceChildren(pre);loaded=true;
     }catch(error){if(item.isConnected){body.textContent=error.message+' ';const retry=document.createElement('button');retry.textContent='Retry';retry.onclick=read;body.append(retry);}}
     finally{loading=false;}
    }
    item.ontoggle=()=>{if(item.open)read();};list.append(item);
   }
   if(rows.length)cursor=rows.at(-1).revision;
   more.hidden=rows.length<30;more.textContent='Load more';status.textContent=list.children.length?'':'No saved revisions yet.';
  }catch(error){if(list.isConnected){status.textContent=error.message;more.textContent='Retry';}}
  finally{busy=false;more.disabled=false;}
 }
 more.onclick=load;return load();
}
