import fs from 'node:fs';
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(line=>line&&!line.startsWith('#')&&line.includes('=')).map(line=>{const at=line.indexOf('=');return [line.slice(0,at),line.slice(at+1)]}));
env.NVIDIA_NIM_API_KEY=env.NVIDIA_NIM_API_KEY_WORKSPACE||env.NVIDIA_NIM_API_KEY;
if(process.argv.includes('--list')){
  const response=await fetch(`${env.NVIDIA_NIM_BASE_URL.replace(/\/$/,'')}/models`,{headers:{Authorization:`Bearer ${env.NVIDIA_NIM_API_KEY}`},signal:AbortSignal.timeout(15000)});
  const body=await response.json();
  console.log((body.data||[]).map(item=>item.id).filter(id=>/(nano|mini|small|3b|4b|7b|8b)/i.test(id)).sort().join('\n'));
  process.exit(response.ok?0:1);
}
const started=Date.now();
const model=env.NIM_FAST_LLM_MODEL;
const isGuard=model==='meta/llama-guard-4-12b';
const response=await fetch(`${env.NVIDIA_NIM_BASE_URL.replace(/\/$/,'')}/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${env.NVIDIA_NIM_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model,...(model.startsWith('openai/gpt-oss-')||model==='moonshotai/kimi-k3'?{reasoning_effort:'low'}:{}),...(model==='moonshotai/kimi-k3'?{temperature:1}:{}),chat_template_kwargs:{enable_thinking:false},max_tokens:isGuard?30:80,stream:!isGuard,messages:[{role:'user',content:'Reply in one short sentence: workspace ready'}]}),signal:AbortSignal.timeout(30000)});
console.log(`headers=${response.status} time=${Date.now()-started}ms model=${env.NIM_FAST_LLM_MODEL}`);
if(!response.ok){console.log((await response.text()).slice(0,300));process.exit(1)}
if(isGuard){const json=await response.json();console.log(`total=${Date.now()-started}ms answer=${String(json?.choices?.[0]?.message?.content||'').slice(0,160)}`);process.exit(json?.choices?.[0]?.message?.content?0:2)}
const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',answer='',firstToken;
while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split('\n');buffer=lines.pop()||'';for(const line of lines){if(!line.startsWith('data:'))continue;const raw=line.slice(5).trim();if(!raw||raw==='[DONE]')continue;const token=JSON.parse(raw).choices?.[0]?.delta?.content;if(token){firstToken??=Date.now()-started;answer+=token}}}
console.log(`firstToken=${firstToken??'none'}ms total=${Date.now()-started}ms answer=${answer.slice(0,160)}`);
if(!answer.trim())process.exit(2);
