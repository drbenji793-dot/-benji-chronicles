import assert from 'node:assert/strict';
import {resolveCurrentHQProtocol,protocolHash,HQ,currentHQSourceURL} from '../src/hq-protocol.js';
import {syncCurrentWritingStandard,writingStandard} from '../src/writing-standards.js';
const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
const make=async(version)=>{const family=version.split('.')[0],protocol={version,family,source:'https://benji-hq.dr-z01.chatgpt.site/standards/current.html',foundation:[{title:'26 operating rules',text:'26 operating rules\nZK7.01.\nPreserve inherited content.'}],refinements:[{rule:'New source observation'}]};return {protocol,sha256:await protocolHash(protocol),resolved:version,requested:version};};
const ar=await make('_zk7.1'),en=await make('_zk5e.2');
const fetcher=async url=>url.endsWith('/api/protocols')?Response.json({editions:[{version:'_zk6.0',sha256:'old'},{version:en.resolved,sha256:en.sha256},{version:ar.resolved,sha256:ar.sha256}]}):Response.json(url.includes('5e')?en:ar);
assert.equal((await resolveCurrentHQProtocol('ar',{fetcher,storage})).resolved,'_zk7.1');
assert.equal((await resolveCurrentHQProtocol('en',{fetcher,storage})).resolved,'_zk5e.2');
const sync=await syncCurrentWritingStandard('ar',{fetcher,storage});assert.equal(sync.code,'_zk7');assert.deepEqual(sync.observations,['New source observation']);assert.equal(sync.rules[0],'ZK7.01. Preserve inherited content.');assert.equal(sync.hqProtocolSha256,ar.sha256);
const offline=await resolveCurrentHQProtocol('ar',{storage,fetcher:async()=>{throw Error('offline')}});assert(offline.offline);assert.equal(offline.resolved,'_zk7.1');
await assert.rejects(()=>resolveCurrentHQProtocol('ar',{storage,fetcher:async url=>url.endsWith('/api/protocols')?Response.json({editions:[{version:ar.resolved,sha256:'bad'}]}):Response.json(ar)}),/verification/);
await assert.rejects(()=>resolveCurrentHQProtocol('ar',{storage,fetcher:async()=>Response.json({editions:[{version:en.resolved,sha256:en.sha256}]})}),/No current protocol/);
assert.equal(writingStandard('en'),null);
await syncCurrentWritingStandard('en',{fetcher,storage});assert.equal(writingStandard('en').code,'_zk5e');
await syncCurrentWritingStandard('ar',{storage,fetcher:async()=>{throw Error('offline')}});assert.equal(writingStandard('ar'),null);
console.log('PASS automatic next-major selection, language isolation, source observations, digest verification, no silent substitution and explicit offline state');

// A newer experiment must not replace the published guide; an old Arabic guide
// cannot reenter the current path even with a valid digest.
for(const excluded of [{status:'draft'},{status:'experiment'},{status:'superseded'},{status:'archived'},{status:'unapproved'},{approved:false},{published:false}]){
 const future=await make('_zk9.0');
 const guarded=async url=>url.endsWith('/api/protocols')?Response.json({editions:[{version:future.resolved,sha256:future.sha256,...excluded},{version:ar.resolved,sha256:ar.sha256}]}):Response.json(ar);
 assert.equal((await resolveCurrentHQProtocol('ar',{fetcher:guarded,storage})).resolved,ar.resolved);
}
const old=await make('_zk6.0');
await assert.rejects(()=>resolveCurrentHQProtocol('ar',{storage,fetcher:async url=>Response.json(url.endsWith('/api/protocols')?{editions:[{version:old.resolved,sha256:old.sha256}]}:old)}),/superseded/);
console.log('PASS newer unapproved guides excluded and valid historical Arabic guide rejected as current');

assert.equal(HQ,'https://benji-hq.vercel.app');
assert.equal(sync.sourceURL,HQ+'/standards/current.html');
assert.equal(sync.sourceProvenanceURL,ar.protocol.source);
assert.equal(await protocolHash(ar.protocol),ar.sha256);
for(const source of ['https://example.com/guide','https://benji-hq.vercel.app.evil.test/guide','https://user@benji-hq.vercel.app/guide'])assert.throws(()=>currentHQSourceURL(source),/Unexpected/);
assert.equal(currentHQSourceURL(HQ+'/zk7.html'),HQ+'/zk7.html');
const requests=[];
await resolveCurrentHQProtocol('ar',{storage,fetcher:async url=>{requests.push(url);return fetcher(url);}});
assert(requests.length>=2);assert(requests.every(url=>new URL(url).origin===HQ));
console.log('PASS active HQ migration, historical digest preservation and rejected foreign guide sources');
