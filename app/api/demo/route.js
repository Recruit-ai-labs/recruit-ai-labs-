const recipient='aadilhussainkhan7@gmail.com';
const volumes=new Set(['1–5 hires / month','6–20 hires / month','21–50 hires / month','50+ hires / month','Just exploring']);

export async function POST(request){
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Please submit the form from this website.'},{status:403});
  let data;
  try{const raw=await request.text();if(raw.length>12000)return Response.json({error:'Your request is too long.'},{status:413});data=JSON.parse(raw);}catch{return Response.json({error:'Invalid form data.'},{status:400});}
  if(!data||typeof data!=='object'||Array.isArray(data))return Response.json({error:'Invalid form data.'},{status:400});
  if(data.website)return Response.json({error:'Unable to submit this request.'},{status:400});
  const fields={};
  for(const [key,max] of Object.entries({name:100,email:254,company:160,phone:30,message:3000,volume:50})){
    if(typeof data[key]!=='string'||data[key].trim().length>max)return Response.json({error:'Please check the form fields and try again.'},{status:400});
    fields[key]=data[key].trim();
  }
  if(!fields.name||!fields.company||fields.message.length<10||!volumes.has(fields.volume)||data.consent!=='yes'||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)||/[\r\n]/.test(fields.name+fields.company+fields.phone))return Response.json({error:'Please complete the required fields with valid details and agree to be contacted.'},{status:400});
  const apiKey=process.env.RESEND_API_KEY,from=process.env.SMTP_FROM_EMAIL;
  if(!apiKey||!from||/YOUR_|yourdomain|example\.com/i.test(apiKey+' '+from))return Response.json({error:'Email is temporarily unavailable. Please contact aadilhussainkhan7@gmail.com directly.'},{status:503});
  try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from:`Recruit AI <${from}>`,to:[recipient],reply_to:fields.email,subject:'New Recruit AI demo request',text:`New demo request from the Recruit AI website\n\nName: ${fields.name}\nEmail: ${fields.email}\nCompany: ${fields.company}\nPhone: ${fields.phone||'Not provided'}\nHiring volume: ${fields.volume}\n\nMessage:\n${fields.message}\n\nConsent: Agreed to be contacted about this demo request.`}),signal:AbortSignal.timeout(15000)});
    const result=await response.json().catch(()=>null);
    if(!response.ok||!result?.id)return Response.json({error:'Your request could not be sent. Please retry or email aadilhussainkhan7@gmail.com.'},{status:502});
    return Response.json({success:true});
  }catch{return Response.json({error:'Email delivery is unavailable right now. Please retry or email aadilhussainkhan7@gmail.com.'},{status:502});}
}
