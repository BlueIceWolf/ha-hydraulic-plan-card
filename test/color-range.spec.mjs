import {expect,test} from '@playwright/test';

test('temperature colours are isolated per hydraulic card',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/test/color-range.html');
  await expect(page.locator('#result')).toHaveText('PASS',{timeout:20000});
  expect(errors).toEqual([]);
});
