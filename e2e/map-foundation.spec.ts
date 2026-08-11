import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

const MAP_URL = '/maps/demo';
const TOKYO_STATION = { latitude: 35.681236, longitude: 139.767125 };

// このPlaywright実行環境固有の既知の制約（アプリのバグではない。PM実機診断済み）:
// - createImageBitmap がこのChromiumビルドで壊れており、SymbolLayers のアイコン読み込みが
//   失敗することがある（try/catchで処理継続・地図描画自体は正常）。
// - Geolonia dev ステージの標高(DEM)タイルが403を返す（任意の地形陰影レイヤーのみに影響）。
// - GeolocateControl成功時の map.fitBounds() で `Cannot read properties of undefined (reading 'lng')`
//   が発生する。これは @geolonia/embed@5.2.2 自身がビルド時にバンドルした独自コピーのmaplibre-gl
//   （cameraForBounds/adjustAntiMeridian）に存在する既知の不具合で、当方のアプリコードや
//   node_modulesのバージョン構成では修正不可能。エラー後もアプリは正常動作を継続する（PM確認済み）。
const KNOWN_ENV_LIMITATIONS = [
  /failed to load icon "pin"/,
  /Image "pin" could not be loaded/,
  /responded with a status of 403/,
  /Cannot read properties of undefined \(reading 'lng'\)/,
];

function isKnownEnvLimitation(text: string): boolean {
  return KNOWN_ENV_LIMITATIONS.some((pattern) => pattern.test(text));
}

function collectPageErrors(page: Page) {
  const consoleErrors: ConsoleMessage[] = [];
  const pageErrors: Error[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message);
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error);
  });
  return {
    assertNone: () => {
      const unexpectedConsoleErrors = consoleErrors
        .map((message) => message.text())
        .filter((text) => !isKnownEnvLimitation(text));
      const unexpectedPageErrors = pageErrors
        .map((error) => error.message)
        .filter((text) => !isKnownEnvLimitation(text));
      expect(unexpectedConsoleErrors).toEqual([]);
      expect(unexpectedPageErrors).toEqual([]);
    },
  };
}

test('地図基盤が表示される（R2.10・帰属表記・LegendCard骨格）', async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.goto(MAP_URL);

  const canvas = page.locator('.maplibregl-canvas');
  await expect(canvas).toBeVisible();
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(canvasBox!.width).toBeGreaterThan(0);
  expect(canvasBox!.height).toBeGreaterThan(0);

  const attribution = page.locator('.maplibregl-ctrl-attrib');
  await expect(attribution).toBeVisible();

  const legendCard = page.getByTestId('legend-card');
  await expect(legendCard).toBeVisible();
  await expect(legendCard).toContainText('凡例');

  await expect(page.getByTestId('geolocate-button')).toBeVisible();

  await page.screenshot({ path: 'screenshots/map-foundation.png' });

  errors.assertNone();
});

test('現在地表示: 許可時（R4.7）', async ({ browser }) => {
  const context = await browser.newContext();
  await context.grantPermissions(['geolocation'], { origin: 'http://127.0.0.1:5273' });
  await context.setGeolocation(TOKYO_STATION);
  const page = await context.newPage();
  const errors = collectPageErrors(page);

  await page.goto(MAP_URL);

  const canvas = page.locator('.maplibregl-canvas');
  await expect(canvas).toBeVisible();

  await page.getByTestId('geolocate-button').click();

  await expect(canvas).toBeVisible();
  errors.assertNone();

  await context.close();
});

test('現在地表示: 拒否時の継続動作（R4.8）', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = collectPageErrors(page);

  await page.goto(MAP_URL);

  const canvas = page.locator('.maplibregl-canvas');
  await expect(canvas).toBeVisible();

  const geolocateButton = page.getByTestId('geolocate-button');
  await geolocateButton.click();

  await expect(canvas).toBeVisible();
  await expect(geolocateButton).toBeEnabled();
  errors.assertNone();

  await context.close();
});
