export const planningChapterPath=({bookId,collection,language='ar'})=>collection?'chronicles_chapters?story_number=eq.'+collection+'&language=eq.'+language:'chronicles_book_entries?book_id=eq.'+(bookId==='66739f5d-2bac-4d75-a4fd-6df93da8ac7e'?'c911584d-bd5b-42fe-b41c-a2a456c64d41':encodeURIComponent(bookId))+'&kind=eq.chapter';
const GARDEN_FIELDS=['schema','template','garden','title','summary','hypothesis','rules','characters','relationships','places','decisions','events','links','objects','world','workStatus','currentUpdate','recordStamps'];
// Lists contain metadata only. Historical payloads are fetched by explicit selection.
export const BRANCH_META='id,book_id,name,archived,revision,updated_by,updated_at,change_note,parent_id,parent_revision';
export async function loadPlanning(api,{bookId,branchId,collection,language='ar',full=false,chapterBodies=false}){
 const scope='book_id=eq.'+encodeURIComponent(bookId);
 const chapterPath=planningChapterPath({bookId,collection,language});
 const results=await Promise.allSettled([
  api('chronicles_dsl_projects?'+scope+'&select='+(full?'*':'book_id,revision')),
  api('chronicles_dsl_branches?'+scope+'&select='+BRANCH_META+'&order=updated_at.asc'),
  api(chapterPath+'&select=id,chapter_number,title,revision'+(chapterBodies?',body':'')+'&order=chapter_number.asc'),
  api('chronicles_books?id=eq.'+encodeURIComponent(bookId)+'&select=id,title,language')
 ]);
 for(const i of [0,1,3])if(results[i].status==='rejected')throw results[i].reason;
 const [projects,branches,,books]=results.map(r=>r.status==='fulfilled'?r.value:[]);
 const selected=branchId?branches.find(b=>b.id===branchId):branches.find(b=>!b.archived);
 if(branchId&&!selected)throw Error('The requested planning branch is unavailable. Choose a current branch explicitly.');
 let branch=null;
 if(selected){const projection=[...GARDEN_FIELDS,'workshop'].map(k=>k+':data->'+k).join(',');const rows=await api('chronicles_dsl_branches?'+scope+'&id=eq.'+encodeURIComponent(selected.id)+'&select='+BRANCH_META+','+(full?'data,base_snapshot':projection)+'&limit=1');branch=rows[0];if(!branch)throw Error('Selected planning revision is unavailable. Retry.');
 if(!full&&!branch.data){const data={};for(const k of [...GARDEN_FIELDS,'workshop']){if(branch[k]!=null)data[k]=branch[k];delete branch[k];}branch={...branch,data,partialData:true};}}
 return {project:projects[0],branches:branches.map(b=>b.id===branch?.id?branch:b),branch,chapters:results[2].status==='fulfilled'?results[2].value:[],book:books[0],chapterError:results[2].status==='rejected'?String(results[2].reason.message||results[2].reason):null};
}
export async function completePlanningForSave(api,branch,data){
 if(!branch.partialData)return data;
 const rows=await api('chronicles_dsl_branches?id=eq.'+encodeURIComponent(branch.id)+'&book_id=eq.'+encodeURIComponent(branch.book_id)+'&revision=eq.'+branch.revision+'&select=data,revision&limit=1');
 if(!rows[0]||rows[0].revision!==branch.revision)throw Error('Planning changed on another device. Reopen before saving.');
 return {...rows[0].data,...data};
}
