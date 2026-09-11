import 'server-only';
const environment=process.env.DODO_ENVIRONMENT==='live_mode'?'live_mode':'test_mode';
const base=environment==='live_mode'?'https://live.dodopayments.com':'https://test.dodopayments.com';
async function request(path,body){if(!process.env.DODO_API_KEY)throw Error('Dodo Payments is not configured.');const response=await fetch(base+path,{method:'POST',headers:{Authorization:`Bearer ${process.env.DODO_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(20000)});const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data?.message||'Dodo Payments request failed.');return data}
export function createCheckout({workspace,email,name,returnUrl}){if(!process.env.DODO_PRODUCT_ID_PRO)throw Error('Dodo Pro product is not configured.');return request('/checkouts',{product_cart:[{product_id:process.env.DODO_PRODUCT_ID_PRO,quantity:1}],customer:{email,name},return_url:returnUrl,metadata:{workspace_id:workspace}})}
export function createPortal(customerId){return request(`/customers/${encodeURIComponent(customerId)}/customer-portal/session`,{})}
