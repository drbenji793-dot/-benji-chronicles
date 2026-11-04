export const reviewCriteria=[
 'Continuity and chronology','Character motivation and agency','Scene purpose and pacing',
 'Dialogue and viewpoint','Language and approved writing voice','Clues and reveal timing',
 'Originality','Ending and emotional payoff','Historical and procedural research'
];
export function reviewContract(language){
 return {version:1,criteria:[...reviewCriteria],writingVoice:language==='ar'?'_zk5':language==='en'?'_zk5e':'Not established',
  instructions:[
   'Review the listed criteria against supplied saved passages only. Do not invent findings to fill every category.',
   'Apply the supplied versioned writingStandard and current book rules. Do not infer a language register or substitute another guide.',
   'Explain each Keep, Rewrite or Cut recommendation with exact source evidence and reader impact. Use Verify for unresolved factual claims.',
   'Preserve protected dialogue, letters, endings and author restrictions. Proposed changes to protected text require separate explicit author approval; finding acceptance is not permission to edit it.',
   'Historical or procedural claims requiring outside evidence are Research gap findings. Identify what needs verification; do not invent sources or label an unverified claim as an established correction.',
   'An empty chapter provides no quotation evidence. Missing passages and unsaved drafts cannot support findings.',
   'Imported findings and repair text remain proposals. This workflow does not edit manuscript prose.'
  ]};
}
