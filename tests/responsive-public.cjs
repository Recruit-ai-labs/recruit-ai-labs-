const assert = require('node:assert/strict');
async function main(){
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'});
  try{
    const page=await browser.newPage({reducedMotion:'reduce'}),failures=[];
    await page.addInitScript(()=>localStorage.setItem('recruit_ai_dpdp_consent','strict'));
    const base=process.env.PUBLIC_BASE_URL||'http://localhost:3100';let checks=0;
    for(const route of ['/','/sign-in','/sign-up','/contact','/demo','/privacy','/terms','/grievance']){
      const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
      assert(response.status()<400,route+' failed with '+response.status());
      await page.waitForTimeout(250);
      for(const width of [320,390,768,1024,1440]){
        await page.setViewportSize({width,height:844});await page.waitForTimeout(90);
        const info=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,culprits:[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+2&&getComputedStyle(el).visibility!=='hidden').slice(0,6).map(el=>el.className||el.tagName)}));
        if(info.scroll>width+1)failures.push({route,width,...info});checks++;
      }
      if(route==='/'){
        await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Open menu'}).click();await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'Pricing',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Open menu'}).getAttribute('aria-expanded'),'false');
        await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'D:/Temp/responsive-public-hero.png'});
      }
    }
    console.log(JSON.stringify({checks,failures},null,2));assert.deepEqual(failures,[]);
    console.log('PASS actual built public pages at 5 viewport widths plus mobile navigation.');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1});
