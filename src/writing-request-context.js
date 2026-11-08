const registeredBook='c911584d-bd5b-42fe-b41c-a2a456c64d41';
export async function writingRequestContext(api,chapter,bookURL){
 const bookId=chapter.book_id||new URLSearchParams(String(bookURL).replace(/^#/, '')).get('book');
 if(bookId!==registeredBook)return null;
 const rows=await api('chronicles_dsl_branches?id=eq.9a8bd2d8-7cd0-484e-a94d-fbdc90f37bd1&book_id=eq.66739f5d-2bac-4d75-a4fd-6df93da8ac7e&archived=eq.false&select=id,book_id,revision');
 const branch=rows?.[0];if(branch?.id!=='9a8bd2d8-7cd0-484e-a94d-fbdc90f37bd1'||branch.book_id!=='66739f5d-2bac-4d75-a4fd-6df93da8ac7e'||!Number.isInteger(branch.revision))throw Error('Current book decisions are unavailable. Reopen the book before preparing a writing request.');
 return {branchId:branch.id,branchRevision:branch.revision};
}
