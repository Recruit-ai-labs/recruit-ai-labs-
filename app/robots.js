export default function robots() {
  const base=(process.env.NEXT_PUBLIC_APP_URL||'https://recruitai.com').replace(/\/$/,'');
  return {rules:[{userAgent:'*',allow:'/',disallow:['/dashboard','/dashboard/','/api/','/candidate','/candidate/','/assessment','/assessment/','/approval-portal','/auth/']}],sitemap:`${base}/sitemap.xml`};
}
