import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../app/api/demo/route.js',import.meta.url),'utf8');
const {POST}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const valid={name:'Demo Test',email:'test@example.com',company:'Test company',phone:'',volume:'Just exploring',message:'Please show candidate reports.',consent:'yes',website:''};
const request=(data,origin='http://localhost:3000')=>new Request('http://localhost:3000/api/demo',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(data)});
test('demo form validates input and handles email provider results',async()=>{
  const originalFetch=globalThis.fetch;
  const oldKey=process.env.RESEND_API_KEY,oldFrom=process.env.SMTP_FROM_EMAIL;
  let calls=0;
  process.env.RESEND_API_KEY='re_test';process.env.SMTP_FROM_EMAIL='demo@recruit.test';
  globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'https://api.resend.com/emails');const body=JSON.parse(options.body);assert.deepEqual(body.to,['aadilhussainkhan7@gmail.com']);assert.equal(body.reply_to,valid.email);assert.match(body.text,/Please show candidate reports/);return Response.json({id:'mock-email-id'});};
  try{
    for(const data of [{...valid,email:'invalid'},{...valid,consent:''},{...valid,message:'short'},{...valid,website:'spam'},null,{...valid,company:'x'.repeat(161)}])assert.equal((await POST(request(data))).status,400);
    assert.equal((await POST(request(valid,'https://other.test'))).status,403);
    assert.equal((await POST(request({...valid,message:'x'.repeat(13000)}))).status,413);
    assert.equal(calls,0);
    const success=await POST(request(valid));assert.equal(success.status,200);assert.deepEqual(await success.json(),{success:true});assert.equal(calls,1);
    globalThis.fetch=async()=>Response.json({message:'Rejected'},{status:403});assert.equal((await POST(request(valid))).status,502);
    globalThis.fetch=async()=>{throw new Error('network failure')};assert.equal((await POST(request(valid))).status,502);
    delete process.env.RESEND_API_KEY;assert.equal((await POST(request(valid))).status,503);
  }finally{globalThis.fetch=originalFetch;for(const [key,value] of [['RESEND_API_KEY',oldKey],['SMTP_FROM_EMAIL',oldFrom]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
