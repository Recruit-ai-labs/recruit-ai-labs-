const http = require('node:http'), assert = require('node:assert/strict');
const { build } = require('./ui-interactions.cjs');
const bundle = build(`
import React from 'react';import {createRoot} from 'react-dom/client';import SignInPanel from './app/components/SignInPanel';
window.signedIn=true;createRoot(document.getElementById('root')).render(<SignInPanel/>);
`);
async function main() {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const server = http.createServer((req,res) => { res.setHeader('Content-Type','text/html'); res.end(`<div id="root"></div><script>${bundle.replaceAll('</script','<\\/script')}</script>`); });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser=await chromium.launch({headless:true}); const page=await browser.newPage(); const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByText('current@example.com',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Continue to your account'}).waitFor();
    await page.getByRole('button',{name:'Use another account'}).waitFor();
    assert.equal(await page.getByLabel('Email address').count(),0);
    assert.equal(await page.getByRole('button',{name:'Continue with Google'}).count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS existing Clerk session shows continue/switch controls and hides new sign-in controls.');
  } finally { await browser?.close(); await new Promise(resolve=>server.close(resolve)); }
}
main().catch(error=>{console.error(error);process.exitCode=1});
