import { test, expect } from './fixtures';

async function connectWallet(page: any) {
  await page.goto('/scheduled-payments');

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

test('scheduled payments: create a new scheduled payment', async ({ page }) => {
  // Mock the turrets API
  await page.route('**/api/turrets/**', route => {
    const url = route.request().url();
    if (url.includes('/list')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
        }),
      });
    } else if (url.includes('/create')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            functionId: 'func-123',
            createdAt: new Date().toISOString(),
          },
        }),
      });
    } else {
      route.fulfill({ status: 200, body: '{}' });
    }
  });

  await connectWallet(page);

  const recipientInput = page.getByLabel('Recipient Address');
  const amountInput = page.getByLabel('Amount');
  const frequencySelect = page.getByLabel('Frequency');

  await expect(recipientInput).toBeVisible();
  await expect(amountInput).toBeVisible();
  await expect(frequencySelect).toBeVisible();

  await recipientInput.fill('GSCHEDULEDPAYEE');
  await amountInput.fill('10');
  await frequencySelect.selectOption('daily');

  const createButton = page.getByRole('button', { name: /Create|Submit/i }).first();
  await expect(createButton).toBeVisible();
  await createButton.click();

  await expect(page.getByText(/scheduled|created/i)).toBeVisible({ timeout: 10000 });
});

test('scheduled payments: display empty state when no payments exist', async ({ page }) => {
  await page.route('**/api/turrets/**', route => {
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

  const emptyState = page.getByText(/no scheduled|no payments|empty/i);
  await expect(emptyState).toBeVisible({ timeout: 10000 });
});

test('scheduled payments: load and display existing scheduled payments', async ({ page }) => {
  const mockPayments = [
    {
      id: 'sched-1',
      type: 'dca',
      config: {
        paymentType: 'scheduled_payment',
        recipient: 'GPAYEE1',
        amount: '5.0000000',
        asset: 'XLM',
        frequency: 'daily',
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sched-2',
      type: 'dca',
      config: {
        paymentType: 'scheduled_payment',
        recipient: 'GPAYEE2',
        amount: '10.0000000',
        asset: 'USDC',
        frequency: 'weekly',
      },
      createdAt: new Date().toISOString(),
    },
  ];

  await page.route('**/api/turrets/**', route => {
    if (route.request().url().includes('/list')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockPayments,
        }),
      });
    } else {
      route.fulfill({ status: 200, body: '{}' });
    }
  });

  await connectWallet(page);

  await expect(page.getByText(/GPAYEE1|GPAYEE2/)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/5\.0000000|10\.0000000/)).toBeVisible();
});

test('scheduled payments: validate recipient address', async ({ page }) => {
  await page.route('**/api/turrets/**', route => {
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

  const recipientInput = page.getByLabel('Recipient Address');
  const amountInput = page.getByLabel('Amount');

  await recipientInput.fill('INVALID_ADDRESS');
  await amountInput.fill('10');

  const createButton = page.getByRole('button', { name: /Create|Submit/i }).first();

  // Button should be disabled or error should show
  const isDisabled = await createButton.isDisabled().catch(() => false);
  const hasError = await page.getByText(/invalid|error/i).isVisible().catch(() => false);

  expect(isDisabled || hasError).toBe(true);
});

test('scheduled payments: validate amount input', async ({ page }) => {
  await page.route('**/api/turrets/**', route => {
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

  const recipientInput = page.getByLabel('Recipient Address');
  const amountInput = page.getByLabel('Amount');

  await recipientInput.fill('GSCHEDULEDPAYEE');
  await amountInput.fill('0');

  const createButton = page.getByRole('button', { name: /Create|Submit/i }).first();

  // Button should be disabled or error should show
  const isDisabled = await createButton.isDisabled().catch(() => false);
  const hasError = await page.getByText(/invalid|error|greater/i).isVisible().catch(() => false);

  expect(isDisabled || hasError).toBe(true);
});

test('scheduled payments: pause and resume a scheduled payment', async ({ page }) => {
  const mockPayments = [
    {
      id: 'sched-1',
      type: 'dca',
      config: {
        paymentType: 'scheduled_payment',
        recipient: 'GPAYEE1',
        amount: '5.0000000',
        asset: 'XLM',
        frequency: 'daily',
      },
      createdAt: new Date().toISOString(),
      status: 'active',
    },
  ];

  await page.route('**/api/turrets/**', route => {
    const url = route.request().url();
    if (url.includes('/list')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockPayments,
        }),
      });
    } else if (url.includes('/pause') || url.includes('/resume')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
        }),
      });
    } else {
      route.fulfill({ status: 200, body: '{}' });
    }
  });

  await connectWallet(page);

  await expect(page.getByText(/GPAYEE1/)).toBeVisible({ timeout: 10000 });

  // Look for pause/resume buttons
  const pauseResumeBtn = page.getByRole('button', { name: /pause|resume/i }).first();
  await expect(pauseResumeBtn).toBeVisible({ timeout: 5000 });

  await pauseResumeBtn.click();

  // Verify the action was called
  await expect(page.getByText(/paused|resumed|success/i)).toBeVisible({ timeout: 10000 });
});

test('scheduled payments: delete a scheduled payment', async ({ page }) => {
  const mockPayments = [
    {
      id: 'sched-1',
      type: 'dca',
      config: {
        paymentType: 'scheduled_payment',
        recipient: 'GPAYEE1',
        amount: '5.0000000',
        asset: 'XLM',
        frequency: 'daily',
      },
      createdAt: new Date().toISOString(),
    },
  ];

  await page.route('**/api/turrets/**', route => {
    const url = route.request().url();
    if (url.includes('/list')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockPayments,
        }),
      });
    } else if (url.includes('/cancel')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
        }),
      });
    } else {
      route.fulfill({ status: 200, body: '{}' });
    }
  });

  await connectWallet(page);

  await expect(page.getByText(/GPAYEE1/)).toBeVisible({ timeout: 10000 });

  const deleteBtn = page.getByRole('button', { name: /delete|remove|cancel/i }).first();
  await expect(deleteBtn).toBeVisible({ timeout: 5000 });

  await deleteBtn.click();

  // Confirm deletion if a dialog appears
  const confirmBtn = page.getByRole('button', { name: /confirm|yes|delete/i }).last();
  const isVisible = await confirmBtn.isVisible().catch(() => false);
  if (isVisible) {
    await confirmBtn.click();
  }

  // Verify deletion
  await expect(page.getByText(/deleted|removed/i)).toBeVisible({ timeout: 10000 });
});
