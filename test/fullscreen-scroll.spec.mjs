import { test, expect } from '@playwright/test';

test('fullscreen large hydraulic schema scrolls vertically with wheel over diagram and horizontally', async ({page}) => {
  await page.setViewportSize({ width: 1100, height: 650 });
  await page.goto('/test/fullscreen-scroll.html');
  const stage=page.locator('hydraulic-plan-card').locator('.stage');
  const card=page.locator('hydraulic-plan-card').locator('ha-card.fullscreen');
  await expect(card).toBeVisible();
  await expect(page.locator('hydraulic-plan-card').locator('#hpi-root')).toBeVisible();
  const metrics=await page.evaluate(()=>{
    const root=window.__scrollCard.shadowRoot;
    const c=root.querySelector('ha-card.fullscreen');
    const s=root.querySelector('.stage');
    return {cardHeight:c.clientHeight,cardScrollHeight:c.scrollHeight,
      stageWidth:s.clientWidth,stageScrollWidth:s.scrollWidth,
      verticalOverscroll:getComputedStyle(s).overscrollBehaviorY,
      horizontalOverscroll:getComputedStyle(s).overscrollBehaviorX,
      cardOverflowY:getComputedStyle(c).overflowY};
  });
  expect(metrics.cardScrollHeight, JSON.stringify(metrics)).toBeGreaterThan(metrics.cardHeight + 50);
  expect(metrics.stageScrollWidth, JSON.stringify(metrics)).toBeGreaterThan(metrics.stageWidth + 50);
  expect(metrics.verticalOverscroll, JSON.stringify(metrics)).toBe('auto');
  expect(metrics.horizontalOverscroll, JSON.stringify(metrics)).toBe('contain');
  expect(metrics.cardOverflowY, JSON.stringify(metrics)).toBe('auto');

  // Wheel over the diagram used to be trapped by overscroll-behavior: contain
  // on the horizontally scrolling stage; it must scroll the fullscreen card.
  const box=await stage.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box.x + Math.min(box.width/2,280),box.y + Math.min(box.height/2,200));
  await page.mouse.wheel(0,390);
  await expect.poll(()=>page.evaluate(()=>window.__scrollCard.shadowRoot.querySelector('ha-card.fullscreen').scrollTop)).toBeGreaterThan(75);

  // Trackpad-style horizontal scrolling remains available.
  await page.evaluate(()=>{window.__scrollCard.shadowRoot.querySelector('ha-card.fullscreen').scrollTop=0;});
  await page.mouse.move(box.x + Math.min(box.width/2,280),box.y + Math.min(box.height/2,200));
  await page.mouse.wheel(410,0);
  await expect.poll(()=>page.evaluate(()=>window.__scrollCard.shadowRoot.querySelector('.stage').scrollLeft)).toBeGreaterThan(50);

  // The normal dashboard must regain normal body scrolling after closing fullscreen.
  await page.evaluate(()=>window.__scrollCard._closeFullscreen());
  expect(await page.evaluate(()=>document.body.style.overflow)).toBe('');
});

test('fullscreen remains scrollable on a narrow viewport', async ({page}) => {
  await page.setViewportSize({width:390,height:700});
  await page.goto('/test/fullscreen-scroll.html');
  const m=await page.evaluate(()=>{
    const card=window.__scrollCard.shadowRoot.querySelector('ha-card.fullscreen');
    const stage=window.__scrollCard.shadowRoot.querySelector('.stage');
    return {
      cardHeight:card.clientHeight,cardScrollHeight:card.scrollHeight,
      width:stage.clientWidth,scrollWidth:stage.scrollWidth,
      overflowY:getComputedStyle(card).overflowY,
      stageOverscrollY:getComputedStyle(stage).overscrollBehaviorY
    };
  });
  expect(m.cardScrollHeight, JSON.stringify(m)).toBeGreaterThan(m.cardHeight);
  expect(m.scrollWidth, JSON.stringify(m)).toBeGreaterThan(m.width);
  expect(m.overflowY).toBe('auto');
  expect(m.stageOverscrollY).toBe('auto');
});
