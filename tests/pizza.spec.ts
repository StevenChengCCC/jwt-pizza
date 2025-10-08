import { test, expect } from 'playwright-test-coverage';
import { basicInit, Role } from './utils/basicInit';

const adminScenario = {
  users: {
    'a@jwt.com': {
      id: '1',
      name: 'Alice Admin',
      email: 'a@jwt.com',
      password: 'admin',
      roles: [{ role: Role.Admin }],
    },
  },
  franchises: {
    franchises: [
      {
        id: 12,
        name: 'MegaPizza',
        admins: [{ id: '33', email: 'megan@jwt.com', name: 'Megan Franchise' }],
        stores: [
          { id: 71, name: 'Downtown', totalRevenue: 0.55 },
          { id: 72, name: 'Uptown', totalRevenue: 0.42 },
        ],
      },
    ],
    more: true,
  },
  franchiseDetails: [
    {
      id: '12',
      name: 'MegaPizza',
      stores: [
        { id: '71', name: 'Downtown', totalRevenue: 0.55 },
        { id: '72', name: 'Uptown', totalRevenue: 0.42 },
      ],
    },
  ],
} as const;

const franchiseScenario = {
  users: {
    'f@jwt.com': {
      id: '9',
      name: 'Frank Franchisee',
      email: 'f@jwt.com',
      password: 'franchise',
      roles: [{ role: Role.Franchisee }],
    },
  },
  franchiseDetails: [
    {
      id: '201',
      name: 'Franklin Pizza',
      stores: [
        { id: '501', name: 'Lakeside', totalRevenue: 0.34 },
        { id: '502', name: 'Airport', totalRevenue: 0.45 },
      ],
    },
  ],
} as const;

test('purchase with login', async ({ page }) => {
  await basicInit(page);

  // Go to order page
  await page.getByRole('button', { name: 'Order now' }).click();

  // Create order
  await expect(page.locator('h2')).toContainText('Awesome is a click away');
  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('button', { name: 'Checkout' }).click();

  // Login
  await page.getByPlaceholder('Email address').click();
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Email address').press('Tab');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  // Pay
  await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
  await expect(page.locator('tbody')).toContainText('Veggie');
  await expect(page.locator('tbody')).toContainText('Pepperoni');
  await expect(page.locator('tfoot')).toContainText('0.008 ₿');
  await page.getByRole('button', { name: 'Pay now' }).click();

  // Delivery and verification
  await expect(page.getByRole('heading', { name: 'Here is your JWT Pizza!' })).toBeVisible();
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.locator('#hs-jwt-modal')).toBeVisible();
  await expect(page.locator('#hs-jwt-modal').getByRole('heading', { name: /JWT Pizza - valid/i })).toBeVisible();
  await page.locator('#hs-jwt-modal').getByRole('button', { name: 'Close' }).last().click();
  await page.getByRole('button', { name: 'Order more' }).click();
  await expect(page).toHaveURL(/\/menu$/);
});

test('diner dashboard shows recent orders after login', async ({ page }) => {
  await basicInit(page, {
    orderHistory: {
      id: 'history-7',
      dinerId: '3',
      orders: [
        {
          id: 'order-42',
          franchiseId: '1',
          storeId: '4',
          date: '2023-05-01T12:00:00.000Z',
          items: [
            { menuId: 1, description: 'Veggie', price: 0.0038 },
            { menuId: 2, description: 'Pepperoni', price: 0.0042 },
          ],
        },
      ],
    },
  });

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'KC' }).click();

  await expect(page.getByText('Here is your history of all the good times.')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'order-42' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '0.008 ₿' })).toBeVisible();
});

test('admin dashboard lists franchise information', async ({ page }) => {
  await basicInit(page, adminScenario);

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'Admin' }).click();

  await expect(page.getByRole('columnheader', { name: 'Franchise', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'MegaPizza' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Megan Franchise' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '0.55 ₿' })).toBeVisible();
});

test('admin can filter, paginate, and manage franchises and stores', async ({ page }) => {
  await basicInit(page, adminScenario);

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Admin' }).click();

  const filter = page.getByPlaceholder('Filter franchises');
  await filter.fill('Mega');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(filter).toHaveValue('Mega');

  const previous = page.getByRole('button', { name: '«' });
  const next = page.getByRole('button', { name: '»' });
  await expect(previous).toBeDisabled();
  await next.click();
  await expect(previous).not.toBeDisabled();
  await previous.click();

  await page.getByRole('button', { name: 'Add Franchise' }).click();
  await page.getByPlaceholder('franchise name').fill('Space Slice');
  await page.getByPlaceholder('franchisee admin email').fill('space@jwt.com');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('heading', { name: "Mama Ricci's kitchen" })).toBeVisible();

  await page.getByRole('button', { name: 'Close' }).first().click();
  await expect(page.getByText('close the MegaPizza franchise')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).first().click();
  await expect(page.getByRole('heading', { name: "Mama Ricci's kitchen" })).toBeVisible();

  await page.locator('tbody tr').filter({ hasText: 'Downtown' }).getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('close the MegaPizza store Downtown')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).first().click();
  await expect(page.getByRole('heading', { name: "Mama Ricci's kitchen" })).toBeVisible();
});

test('registering a new diner updates the navigation', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByPlaceholder('Full name').fill('New Joiner');
  await page.getByRole('textbox', { name: 'Email address' }).fill('new@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('p4ssword');
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByRole('link', { name: 'NJ' })).toBeVisible();
});


test('docs view renders mocked endpoints', async ({ page }) => {
  await basicInit(page, {
    docs: {
      endpoints: [
        {
          requiresAuth: true,
          method: 'POST',
          path: '/api/sample',
          description: 'Create a sample resource',
          example: 'POST /api/sample',
          response: { ok: true },
        },
      ],
    },
  });

  await page.goto('/docs/service');

  await expect(page.getByRole('heading').filter({ hasText: '[POST] /api/sample' })).toBeVisible();
  await expect(page.getByText('Create a sample resource')).toBeVisible();
  await expect(page.getByText('"ok": true')).toBeVisible();
});


test('payment shows an error when the order fails', async ({ page }) => {
  await basicInit(page, {
    orderError: { message: 'Insufficient funds' },
  });

  await page.getByRole('button', { name: 'Order now' }).click();
  await expect(page.locator('h2')).toContainText('Awesome is a click away');
  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('button', { name: 'Checkout' }).click();

  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByText('⚠️ Insufficient funds')).toBeVisible();

  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/);
});

test('about page highlights the team', async ({ page }) => {
  await basicInit(page);
  await page.goto('/about');

  await expect(page.getByRole('heading', { name: 'Our employees' })).toBeVisible();
  await expect(page.getByAltText('Employee stock photo')).toHaveCount(4);
});

test('logout redirects diners back home', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();

  await page.getByRole('link', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/?$/);
  await expect(page.getByRole('button', { name: 'Order now' })).toBeVisible();
});

test('history page celebrates Mama Ricci', async ({ page }) => {
  await basicInit(page);
  await page.goto('/history');

  await expect(page.getByRole('heading', { name: 'Mama Rucci, my my' })).toBeVisible();
  await expect(page.getByText('Pizza has a long and rich history', { exact: false })).toBeVisible();
});

test('icons render without crashing when imported dynamically', async ({ page }) => {
  await basicInit(page);
  const iconNames = await page.evaluate(async () => {
    const icons = await import('/src/icons.tsx');
    return [
      icons.TrashIcon(),
      icons.LocationIcon(),
      icons.KeyIcon(),
      icons.CautionIcon(),
      icons.CloseEyeIcon(),
      icons.PersonIcon(),
      icons.EmailIcon(),
      icons.StoreIcon(),
      icons.CloseIcon({ className: 'x' }),
      icons.HouseIcon(),
      icons.HamburgerIcon({ className: 'y' }),
      icons.GreaterThanIcon(),
    ].map((element) => element.type?.displayName ?? element.type?.name ?? typeof element.type);
  });

  await expect(iconNames.filter(Boolean)).toHaveLength(12);
});
