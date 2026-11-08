import {expect,test} from '@playwright/test';
test('migration is reversible, idempotent and lossless',async({page})=>{
 await page.goto('/test/migration.html');
 await expect(page.locator('#result')).toHaveText('PASS',{timeout:20000});
});
