import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('public regressions keep auth fallback, hidden honeypot and a grievance channel',()=>{
  assert.match(read('app/components/SignInPanel.jsx'),/sessionTimedOut/);
  assert.match(read('app/demo/DemoForm.jsx'),/className="demoTrap"[^>]*hidden/);
  assert.match(read('app/grievance/page.jsx'),/mailto:hello@recruitailabs\.in/);
});
test('homepage renders FAQ copy, video fallback, clean copy and no public dashboard link',()=>{
  const source=read('app/page.jsx');
  assert.match(source,/poster="\/hero-stationery-v1\.jpg"/);assert.match(source,/<img src="\/hero-stationery-v1\.jpg"/);
  assert.ok(source.includes('hidden={!expanded}'));assert.doesNotMatch(source,/Founders photo/);assert.doesNotMatch(source,/href="\/dashboard"/);assert.doesNotMatch(source,/>AI<\/em>Book a demo/);
});
test('legal naming and crawl controls are consistent',()=>{
  assert.doesNotMatch(read('app/terms/page.jsx'),/Recruit AI Inc\./);
  const robots=read('app/robots.js'),sitemap=read('app/sitemap.js');
  assert.match(robots,/disallow:\['\/dashboard'/);assert.doesNotMatch(sitemap,/dashboard/);assert.match(sitemap,/grievance/);
});
