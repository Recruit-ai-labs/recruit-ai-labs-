export default function sitemap() {
  const base=(process.env.NEXT_PUBLIC_APP_URL||'https://recruitai.com').replace(/\/$/,'');
  return ['/','/demo','/contact','/privacy','/grievance','/terms'].map(path=>({url:`${base}${path}`,changeFrequency:path==='/'?'weekly':'monthly',priority:path==='/'?1:.6}));
}
