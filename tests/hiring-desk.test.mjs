import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {taskState, validateDeskEvent, ageDays} from '../lib/hiring-desk.mjs';
import {generateTechDna, extractJdDetails} from '../lib/discovery-simple.mjs';
const require = createRequire(import.meta.url);
const {transformSync} = require('next/dist/build/swc');
function load(path, mocks) {
  const code = transformSync(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), {jsc: {target: 'es2020', parser: {syntax: 'ecmascript'}}, module: {type: 'commonjs'}}).code;
  const module = {exports: {}};
  new Function('require', 'module', 'exports', code)(id => {if (id in mocks) return mocks[id]; throw Error(`Unmocked import: ${id}`);}, module, module.exports);
  return module.exports;
}
const escaped = value => String(value).replaceAll('"', '\\"');

test('task history preserves ownership and completion when newer notes arrive', () => {
  const rows = [{metadata:{key:'application:a',kind:'note',at:'2026-09-05',note:'New note'}},{metadata:{key:'application:a',kind:'done',at:'2026-09-04'}},{metadata:{key:'application:a',kind:'assign',owner:'u1',at:'2026-09-03'}}];
  assert.deepEqual(taskState(rows,'application:a'),{kind:'done',due:'',owner:'u1'});
});
test('task validation accepts only application records', () => {
  const valid={key:'application:abc-123',kind:'snooze',due:'2026-09-21'};
  assert.equal(validateDeskEvent(valid).due,'2026-09-21');
  assert.throws(()=>validateDeskEvent({...valid,key:'interview:abc'}));
  assert.throws(()=>validateDeskEvent({...valid,due:'2026-02-31'}));
  assert.equal(ageDays('not a date'),null);
});
test('discovery excerpts make no provider calls and failed JD extraction invents no criteria', async () => {
  const previous=global.fetch,key=process.env.NVIDIA_NIM_API_KEY; delete process.env.NVIDIA_NIM_API_KEY; global.fetch=()=>{throw Error('Unexpected provider call');};
  try {const brief=await generateTechDna({candidate:{snippet:'Python developer'},jobTitle:'React expert'});assert.match(brief,/Verify:/);const fallback=await extractJdDetails('Job title: Accountant');assert.deepEqual(fallback.skills,[]);} finally {global.fetch=previous;if(key===undefined)delete process.env.NVIDIA_NIM_API_KEY;else process.env.NVIDIA_NIM_API_KEY=key;}
});
test('desk queries scope every read and paginate application activity', async () => {
  const calls=[];
  const {getHiringDeskData}=load('../lib/hiring-desk-data.js',{'server-only':{},'./pocketbase':{pbFilterValue:escaped,listRecords:async(collection,options)=>{calls.push({collection,...options});if(collection==='applications')return {items:[{id:'a',candidate:'c',job:'j'}],totalPages:2};if(collection==='activities')return {items:[{id:`e${options.page}`}],totalPages:2};return {items:[],totalPages:1};}}});
  const data=await getHiringDeskData('workspace-one',{job:'j'});assert.equal(data.events.length,2);assert(calls.every(call=>call.filter.startsWith('workspace = "workspace-one"')));assert(!calls.some(call=>call.collection==='interviews'));
});
test('desk unavailable data propagates instead of showing fake empty queues', async () => {
  const {getHiringDeskData}=load('../lib/hiring-desk-data.js',{'server-only':{},'./pocketbase':{pbFilterValue:escaped,listRecords:async()=>{throw Error('Offline');}}});
  await assert.rejects(getHiringDeskData('w'),/Offline/);
});
test('desk actions check permission and workspace before writing', async () => {
  let allowed=false,exists=false;const writes=[];
  const {saveDeskEvent}=load('../app/dashboard/hiring-desk/actions.js',{'next/cache':{revalidatePath:()=>{}},'../../../lib/workspace-page':{requireWorkspace:async()=>({workspace:{id:'w'},membership:{},userId:'real-user'})},'../../../lib/recruit-data':{canManageCandidates:()=>allowed},'../../../lib/hiring-desk.mjs':{validateDeskEvent},'../../../lib/pocketbase':{pbFilterValue:escaped,listRecords:async()=>({items:exists?[{id:'a'}]:[]}),createRecord:async(_collection,payload)=>writes.push(payload)}});
  const form=new FormData();form.set('kind','assign');form.set('key','application:a');assert((await saveDeskEvent({},form)).error);allowed=true;exists=true;assert((await saveDeskEvent({},form)).success);assert.equal(writes[0].metadata.owner,'real-user');
});
