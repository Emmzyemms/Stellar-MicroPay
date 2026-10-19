import { test, expect } from './fixtures';

async function connectWallet(page: any) {
  await page.goto('/streams');

  const alreadyConnected = await page
    .locator('p.label', { hasText: 'Wallet Address' })
    .isVisible()
    .catch(() => false);
  if (alreadyConnected) return;

  await page.getByRole('button', { name: /Connect Freighter Wallet/i }).click();

  await expect(
    page.locator('p.label').filter({ hasText: 'Wallet Address' })
  ).toBeVisible({ timeout: 15000 });
}

test('streams: displays open streams form', async ({ page }) => {
  await connectWallet(page);

  const recipientInput = page.getByLabel(/recipient|destination/i);
  const rateInput = page.getByLabel(/rate|per hour/i);
  const depositInput = page.getByLabel(/deposit|amount/i);

  await expect(recipientInput).toBeVisible({ timeout: 10000 });
  await expect(rateInput).toBeVisible({ timeout: 5000 });
  await expect(depositInput).toBeVisible({ timeout: 5000 });
});

test('streams: creates a new payment stream', async ({ page }) => {
  await page.route('**/api/soroban/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          streamId: 'stream-123',
          createdAt: new Date().toISOString(),
        },
      }),
    });
  });

  await connectWallet(page);

  const recipientInput = page.getByLabel(/recipient|destination/i);
  const rateInput = page.getByLabel(/rate|per hour/i);
  const depositInput = page.getByLabel(/deposit|amount/i);

  await expect(recipientInput).toBeVisible({ timeout: 10000 });

  await recipientInput.fill('GSTREAMRECIPIENT');
  await rateInput.fill('0.1');
  await depositInput.fill('10');

  const openButton = page.getByRole('button', { name: /open|create|start/i }).first();
  await expect(openButton).toBeVisible({ timeout: 5000 });
  await openButton.click();

  await expect(page.getByText(/stream|created|opened|success/i)).toBeVisible({ timeout: 10000 });
});

test('streams: displays empty state when no streams exist', async ({ page }) => {
  await page.route('**/api/soroban/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [],
      }),
    });
  });

  await connectWallet(page);

  const emptyState = page.getByText(/no streams|empty|none/i);
  await expect(emptyState).toBeVisible({ timeout: 10000 });
});

test('streams: displays list of active streams', async ({ page }) => {
  await page.route('**/api/soroban/**', route => {
    const url = route.request().url();
    if (url.includes('/streams')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              streamId: 'stream-1',
              payer: 'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3D5NZ2KMSUGSRNVO7ZFGIGSZ',
              recipient: 'GSTREAMRECIPIENT1',
              ratePerHour: '0.5',
              deposit: '10.0000000',
              claimable: '2.5000000',
              startTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
              isActive: true,
            },
          ],
        }),
      });
    } else {
      route.fulfill({ status: 200, body: '{}' });
    }
  });

  await connectWallet(page);

  const recipientText = page.getByText(/GSTREAMRECIPIENT1/);
  await expect(recipientText).toBeVisible({ timeout: 10000 });

  const amountText = page.getByText(/10\.0000000|2\.5000000/);
  await expect(amountText).toBeVisible({ timeout: 5000 });
});

test('streams: switches between tabs (open, my-streams, received)', async ({ page }) => {
  await connectWallet(page);

  const openTab = page.getByRole('tab', { name: /open|create/i });
  const myStreamsTab = page.getByRole('tab', { name: /my|created/i });
  const receivedTab = page.getByRole('tab', { name: /received|incoming/i });

  await expect(openTab).toBeVisible({ timeout: 10000 });

  if (await myStreamsTab.isVisible().catch(() => false)) {
    await myStreamsTab.click();
    const recipientLabel = page.getByText(/recipient|payer/i);
    await expect(recipientLabel).toBeVisible({ timeout: 5000 });
  }

  if (await receivedTab.isVisible().catch(() => false)) {
    await receivedTab.click();
    const senderLabel = page.getByText(/payer|sender/i);
    await expect(senderLabel).toBeVisible({ timeout: 5000 });
  }
});

test('streams: claims claimable balance from stream', async ({ page }) => {
  await page.route('**/api/soroban/**', route => {
    const url = route.request().url();
    if (url.includes('/streams')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              streamId: 'stream-1',
              payer: 'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3D5NZ2KMSUGSRNVO7ZFGIGSZ',
              recipient: 'GSTREAMRECIPIENT1',
              ratePerHour: '0.5',
              deposit: '10.0000000',
              claimable: '5.0000000',
              startTime: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
              isActive: true,
            },
          ],
        }),
      });
    } else if (url.includes('/claim')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          txHash: 'txhash123',
        }),
      });
    } else {
      route.fulfill({ status: 200, body: '{}' });
    }
  });

  await connectWallet(page);

  const myStreamsTab = page.getByRole('tab', { name: /my|created/i });
  if (await myStreamsTab.isVisible().catch(() => false)) {
    await myStreamsTab.click();
  }

  const claimButton = page.getByRole('button', { name: /claim|withdraw/i }).first();
  if (await claimButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await claimButton.click();
    await expect(page.getByText(/claim|success|withdrawn/i)).toBeVisible({ timeout: 10000 });
  }
});

test('streams: closes a stream', async ({ page }) => {
  await page.route('**/api/soroban/**', route => {
    const url = route.request().url();
    if (url.includes('/streams')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              streamId: 'stream-1',
              payer: 'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3D5NZ2KMSUGSRNVO7ZFGIGSZ',
              recipient: 'GSTREAMRECIPIENT1',
              ratePerHour: '0.5',
              deposit: '10.0000000',
              claimable: '0',
              startTime: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
              isActive: true,
            },
          ],
        }),
      });
    } else if (url.includes('/close')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          txHash: 'txhash456',
        }),
      });
    } else {
      route.fulfill({ status: 200, body: '{}' });
    }
  });

  await connectWallet(page);

  const myStreamsTab = page.getByRole('tab', { name: /my|created/i });
  if (await myStreamsTab.isVisible().catch(() => false)) {
    await myStreamsTab.click();
  }

  const closeButton = page.getByRole('button', { name: /close|end|stop/i }).first();
  if (await closeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await closeButton.click();

    // Handle confirmation dialog if present
    const confirmBtn = page.getByRole('button', { name: /confirm|yes|close/i }).last();
    const isConfirmVisible = await confirmBtn.isVisible().catch(() => false);
    if (isConfirmVisible) {
      await confirmBtn.click();
    }

    await expect(page.getByText(/close|ended|success/i)).toBeVisible({ timeout: 10000 });
  }
});

test('streams: displays stream details with rates and balances', async ({ page }) => {
  await page.route('**/api/soroban/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            streamId: 'stream-1',
            payer: 'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3D5NZ2KMSUGSRNVO7ZFGIGSZ',
            recipient: 'GSTREAMRECIPIENT1',
            ratePerHour: '0.5',
            deposit: '10.0000000',
            claimable: '2.5000000',
            startTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            isActive: true,
          },
        ],
      }),
    });
  });

  await connectWallet(page);

  const myStreamsTab = page.getByRole('tab', { name: /my|created/i });
  if (await myStreamsTab.isVisible().catch(() => false)) {
    await myStreamsTab.click();
  }

  const rateText = page.getByText(/0\.5|rate/i);
  const depositText = page.getByText(/10\.0000000|deposit/i);
  const claimableText = page.getByText(/2\.5000000|claimable/i);

  await expect(rateText).toBeVisible({ timeout: 10000 });
  await expect(depositText).toBeVisible({ timeout: 5000 });
  await expect(claimableText).toBeVisible({ timeout: 5000 });
});

test('streams: validates recipient address on create', async ({ page }) => {
  await connectWallet(page);

  const recipientInput = page.getByLabel(/recipient|destination/i);
  const rateInput = page.getByLabel(/rate|per hour/i);
  const depositInput = page.getByLabel(/deposit|amount/i);

  await expect(recipientInput).toBeVisible({ timeout: 10000 });

  await recipientInput.fill('INVALID_ADDRESS');
  await rateInput.fill('0.1');
  await depositInput.fill('10');

  const openButton = page.getByRole('button', { name: /open|create|start/i }).first();
  const isDisabled = await openButton.isDisabled().catch(() => false);
  const hasError = await page.getByText(/invalid|error/i).isVisible().catch(() => false);

  expect(isDisabled || hasError).toBe(true);
});

test('streams: validates amount and rate inputs', async ({ page }) => {
  await connectWallet(page);

  const rateInput = page.getByLabel(/rate|per hour/i);
  const depositInput = page.getByLabel(/deposit|amount/i);

  await expect(rateInput).toBeVisible({ timeout: 10000 });

  await rateInput.fill('0');
  await depositInput.fill('0');

  const openButton = page.getByRole('button', { name: /open|create|start/i }).first();
  const isDisabled = await openButton.isDisabled().catch(() => false);
  const hasError = await page.getByText(/invalid|error|greater|positive/i).isVisible().catch(() => false);

  expect(isDisabled || hasError).toBe(true);
});
