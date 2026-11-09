import {expect,test} from '@playwright/test';
test('migration is reversible, idempotent and lossless',async({page},testInfo)=>{
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/test/migration.html');
 await page.waitForTimeout(100);
 await testInfo.attach('migration-browser-errors.txt',{
  body:Buffer.from(errors.join('\n')||'(no uncaught page errors)'),
  contentType:'text/plain',
 });
 await expect(page.locator('#result')).toHaveText('PASS',{timeout:20000});
});
