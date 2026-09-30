// Real Chromium checks of the actual pages/components; email, Clerk and database are fixtures.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { transformSync } = require('next/dist/build/swc');
const root = path.resolve(__dirname, '..');
const modules = [], ids = new Map();
const stubs = {
  'server-only': 'module.exports={}',
  'next/navigation': `exports.redirect=p=>{throw Error('REDIRECT:'+p)};exports.useRouter=()=>({refresh:()=>{window.refreshes=(window.refreshes||0)+1}});`,
  '@clerk/nextjs': `exports.useClerk=()=>({session:null,signOut:async()=>{}});`,
  '@clerk/nextjs/legacy': `exports.useSignIn=()=>({isLoaded:true,signIn:{create:async p=>{window.clerkTicket=p;return {status:'complete',createdSessionId:'test-session'}}},setActive:async()=>{window.activated=true}});`,
  'access': `exports.requireAccessIdentity=async()=>({email:window.entry.email});exports.requireApprovalAdmin=async()=>({email:'aadilhussainkhan7@gmail.com'});exports.accessService=()=>({ensureRequest:async()=>window.entry});`,
  'access-core': `exports.APPROVAL_ADMIN='aadilhussainkhan7@gmail.com';`,
  'turso': `exports.getTursoClient=()=>({execute:async query=>({rows:typeof query==='string'?[{total:1,review:1,approved:0}]:query.sql.includes('COUNT')?[{total:1}]:[window.entry]})});`,
};
function add(file, source) {
  if (ids.has(file)) return ids.get(file);
  const id = modules.length; ids.set(file, id); modules.push('');
  let code = source === undefined ? fs.readFileSync(file, 'utf8') : source;
  if (!file.includes('node_modules')) code = transformSync(code, { jsc: { target: 'es2020', parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } }).code;
  code = code.replace(/require\(["']([^"']+)["']\)/g, (_, spec) => {
    let target, stub;
    if (spec.endsWith('.css')) { target = 'stub:css'; stub = 'module.exports={}'; }
    else {
      const key = /\/lib\/access$/.test(spec) ? 'access' : /\/lib\/access-core.mjs$/.test(spec) ? 'access-core' : /\/lib\/turso$/.test(spec) ? 'turso' : spec;
      if (stubs[key]) { target = `stub:${key}`; stub = stubs[key]; }
      else if (spec.startsWith('.')) { const base = path.resolve(path.dirname(file), spec); target = ['', '.js', '.jsx', '.mjs'].map(ext => base + ext).find(p => fs.existsSync(p)); }
      else target = require.resolve(spec, { paths: [root] });
    }
    if (!target) throw new Error('Missing test dependency: ' + spec);
    return `require(${add(target, stub)})`;
  });
  modules[id] = `function(module,exports,require){${code}\n}`;
  return id;
}
const fixture = { number: 42, email: 'team@example.com', name: 'Example Team', company: 'Acme', phone: '', volume: '6-20 hires / month', message: 'We want to improve our engineering hiring process.', status: 'pending', created_at: Date.now(), submitted_at: Date.now() };
const entry = add(path.join(root, 'access-browser-entry.jsx'), `import React from 'react';import {createRoot} from 'react-dom/client';import WaitingPage from './app/waiting-list/page';import Portal from './app/approval-portal/page';import EmailForm from './app/components/EmailAccessForm';
window.entry=${JSON.stringify(fixture)};const app=createRoot(document.getElementById('root'));window.show=async(view)=>{if(view==='login')app.render(<div style={{maxWidth:420,margin:'80px auto',padding:24}}><EmailForm/></div>);else app.render(await (view==='portal'?Portal({searchParams:Promise.resolve({})}):WaitingPage()));};window.show('waiting');`);
const bundle = `var process={env:{NODE_ENV:'production'}};var modules=[${modules.join(',')}],cache={};function require(id){if(cache[id])return cache[id].exports;var m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}require(${entry});`;
const css = ['app/globals.css', 'app/mobile.css', 'app/theme.css', 'app/demo/demo.css', 'app/demo/grain.css', 'app/waiting-list/waiting-list.css', 'app/approval-portal/portal.css'].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n').replace(/@import[^;]+;/g, '');
async function main() {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const server = http.createServer((req, res) => {
    const asset = path.resolve(root, 'public', '.' + req.url.split('?')[0]);
    if (asset.startsWith(path.join(root, 'public') + path.sep) && fs.existsSync(asset) && fs.statSync(asset).isFile()) return res.end(fs.readFileSync(asset));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script>${bundle.replaceAll('</script', '<\\/script')}</script>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ reducedMotion: 'reduce' }); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByText('#0042', { exact: true }).waitFor();
    for (const view of ['waiting', 'portal']) {
      await page.evaluate(view => window.show(view), view);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        const size = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
        assert(size.content <= size.width + 1, `${view}: horizontal overflow at ${width}: ${size.content}`);
        if ([390,1440].includes(width)) await page.screenshot({ path: `D:/Temp/access-${view}-${width}.png`, fullPage: true });
      }
    }
    await page.evaluate(() => window.show('waiting'));
    assert(await page.getByLabel('Work email').evaluate(el => el.readOnly));
    let submission;
    await page.route('**/api/waiting-list', async route => { submission = route.request().postDataJSON(); await route.fulfill({ json: { number: 42, status: 'pending' } }); });
    await page.getByLabel('Full name').fill('Updated Applicant');
    await page.getByRole('button', { name: 'Update my details' }).click();
    await page.getByRole('status').filter({ hasText: 'Your details are saved' }).waitFor();
    assert.equal(submission.name, 'Updated Applicant'); assert.equal(submission.email, 'team@example.com');
    assert.equal(await page.getByLabel('Full name').inputValue(), 'Updated Applicant');
    await page.evaluate(() => window.show('portal'));
    let approval;
    await page.route('**/api/approvals', async route => { approval = route.request().postDataJSON(); await route.fulfill({ json: { approved: true, notified: false } }); });
    await page.getByRole('button', { name: 'Approve access' }).click();
    await page.getByText('Approved, but email delivery failed. Retry the notification.').waitFor();
    assert.deepEqual(approval, { number: 42 });
    await page.evaluate(() => { window.entry.status = 'approved'; window.entry.approved_at = Date.now(); return window.show('portal'); });
    await page.getByRole('button', { name: 'Retry approval email' }).waitFor();
    await page.evaluate(() => window.show('waiting'));
    await page.getByRole('link', { name: 'Sign in to your workspace' }).waitFor();
    assert.equal(await page.locator('form.demoForm').count(), 0);
    await page.evaluate(() => window.show('login'));
    await page.route('**/api/access/request', route => route.fulfill({ json: { challengeId: 'fixture-challenge' } }));
    await page.getByLabel('Email address').fill('person@example.com');
    await page.getByRole('button', { name: 'Continue with email' }).click();
    await page.getByLabel('Verification code').fill('123456');
    await page.route('**/api/access/verify', route => route.fulfill({ status: 400, json: { error: 'Invalid or expired code.' } }));
    await page.getByRole('button', { name: 'Verify & continue' }).click();
    await page.getByRole('alert').filter({ hasText: 'Invalid or expired' }).waitFor();
    await page.getByRole('button', { name: 'Change email' }).click();
    await page.getByLabel('Email address').waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: waiting list and portal at 320/390/768/1440px; form save; verified email locked; approval failure/retry; approved login link; OTP error/change email. No browser errors.');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
