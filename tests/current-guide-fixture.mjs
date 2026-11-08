// Synthetic published guides for isolated tests. Never production guidance.
import {protocolHash,HQ} from '../src/hq-protocol.js';
import {syncCurrentWritingStandard} from '../src/writing-standards.js';
export async function installCurrentGuideFixture(){
 const payloads={};
 for(const [language,version] of Object.entries({ar:'_zk7.1',en:'_zk5e.2'})){
  const protocol={version,family:version.split('.')[0],source:HQ+'/standards/test-fixture.html',foundation:[{title:'Foundation',text:'Preserve current approved decisions.'}],refinements:[]};
  payloads[language]={protocol,resolved:version,requested:version,sha256:await protocolHash(protocol)};
 }
 const previous=globalThis.fetch;
 const fetcher=async input=>{
  const url=new URL(String(input));
  if(url.origin!==HQ||url.pathname!=='/api/protocols')throw Error('Unexpected test network request: '+url);
  const code=url.searchParams.get('code');
  if(!code)return Response.json({editions:Object.values(payloads).map(p=>({version:p.resolved,sha256:p.sha256,status:'published'}))});
  const payload=Object.values(payloads).find(p=>p.resolved===code);
  return Response.json(payload||{error:'Unknown fixture'},{status:payload?200:404});
 };
 globalThis.fetch=fetcher;
 for(const language of ['ar','en'])await syncCurrentWritingStandard(language,{fetcher});
 return {payloads,fetcher,restore:()=>{globalThis.fetch=previous;}};
}
