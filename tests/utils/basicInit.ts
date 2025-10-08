// tests/utils/basicInit.ts
import { expect } from 'playwright-test-coverage';
import type { Page } from '@playwright/test';

declare global {
  interface Window {
    HSOverlay?: { open: (element: HTMLElement) => void };
    HSStaticMethods?: { autoInit: () => void };
  }
}

export enum Role {
  Diner = 'diner',
  Admin = 'admin',
  Franchisee = 'franchisee',
}

export type User = {
  id: string;
  name: string;
  email: string;
  password?: string;
  roles: { role: Role; objectId?: string }[];
};

type MenuItem = {
  id: number;
  title: string;
  image: string;
  price: number;
  description: string;
};

type FranchiseList = {
  franchises: {
    id: number;
    name: string;
    admins?: { id?: string; email: string; name: string }[];
    stores: { id: number; name: string; totalRevenue?: number }[];
  }[];
  more?: boolean;
};

type Franchise = {
  id: string | number;
  name: string;
  admins?: { id?: string; email: string; name: string }[];
  stores: { id: string | number; name: string; totalRevenue?: number }[];
};

type OrderItem = {
  menuId: number;
  description: string;
  price: number;
};

type Order = {
  id: string;
  franchiseId: string;
  storeId: string;
  date: string;
  items: OrderItem[];
};

type OrderHistory = {
  id: string;
  dinerId: string;
  orders: Order[];
};

type Endpoint = {
  requiresAuth: boolean;
  method: string;
  path: string;
  description: string;
  example: string;
  response: unknown;
};

type Endpoints = {
  endpoints: Endpoint[];
};

type JWTPayload = {
  message: string;
  payload: unknown;
};

export type BasicInitOptions = {
  users?: Record<string, User>;
  menu?: MenuItem[];
  franchises?: FranchiseList;
  franchiseDetails?: Franchise[];
  orderHistory?: OrderHistory;
  orderResponse?: { order: Order; jwt: string };
  orderError?: { status?: number; message: string };
  docs?: Endpoints;
  registerError?: { status?: number; message: string; email?: string };
  verifyResponse?: JWTPayload;
  verifyError?: { status?: number; message: string; payload?: unknown };
};

export async function basicInit(page: Page, options: BasicInitOptions = {}) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = {
    'd@jwt.com': { id: '3', name: 'Kai Chen', email: 'd@jwt.com', password: 'a', roles: [{ role: Role.Diner }] },
    ...options.users,
  };

  const defaultMenu: MenuItem[] = [
    { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
    { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
  ];

  const defaultFranchises: FranchiseList =
    options.franchises ??
    ({
      franchises: [
        {
          id: 2,
          name: 'LotaPizza',
          admins: [{ id: '10', email: 'fran@jwt.com', name: 'Francine Franchisee' }],
          stores: [
            { id: 4, name: 'Lehi', totalRevenue: 1.23 },
            { id: 5, name: 'Springville', totalRevenue: 0.57 },
            { id: 6, name: 'American Fork', totalRevenue: 0.91 },
          ],
        },
        { id: 3, name: 'PizzaCorp', stores: [{ id: 7, name: 'Spanish Fork', totalRevenue: 0.25 }] },
        { id: 4, name: 'topSpot', stores: [] },
      ],
      more: false,
    } as FranchiseList);

  const defaultOrderHistory: OrderHistory =
    options.orderHistory ??
    ({
      id: 'history-1',
      dinerId: '3',
      orders: [],
    } as OrderHistory);

  const defaultFranchiseDetails: Franchise[] =
    options.franchiseDetails ??
    ([
      {
        id: '200',
        name: 'Rocket Slice',
        stores: [
          { id: '900', name: 'Downtown', totalRevenue: 1.23 },
          { id: '901', name: 'Uptown', totalRevenue: 0.87 },
        ],
      },
    ] as Franchise[]);

  const defaultDocs: Endpoints =
    options.docs ??
    ({
      endpoints: [
        {
          requiresAuth: false,
          method: 'GET',
          path: '/api/order/menu',
          description: 'List the available pizzas.',
          example: 'GET /api/order/menu',
          response: defaultMenu,
        },
      ],
    } as Endpoints);

  function sanitizeUser(user: User) {
    const { password, ...rest } = user;
    return rest;
  }

  await page.addInitScript(() => {
    window.HSOverlay =
      window.HSOverlay ??
      ({
        open: (element: HTMLElement) => {
          element.classList.remove('hidden');
        },
      } as { open: (element: HTMLElement) => void });
    window.HSStaticMethods = window.HSStaticMethods ?? { autoInit: () => {} };
  });

  await page.route('*/**/api/auth', async (route) => {
    const method = route.request().method();
    if (method === 'DELETE') {
      loggedInUser = undefined;
      await route.fulfill({ status: 204, json: {} });
      return;
    }

    const body = route.request().postDataJSON() as { name?: string; email: string; password: string };
    if (method === 'POST') {
      if (options.registerError && (!options.registerError.email || options.registerError.email === body.email)) {
        await route.fulfill({ status: options.registerError.status ?? 400, json: { message: options.registerError.message } });
        return;
      }
      const newUser: User =
        validUsers[body.email] ??
        ({
          id: Math.random().toString(36).slice(2),
          name: body.name ?? body.email,
          email: body.email,
          password: body.password,
          roles: [{ role: Role.Diner }],
        } as User);
      validUsers[body.email] = { ...newUser, password: body.password };
      loggedInUser = validUsers[body.email];
      await route.fulfill({ json: { user: sanitizeUser(loggedInUser), token: 'registered-token' } });
      return;
    }

    const user = validUsers[body.email];
    if (!user || user.password !== body.password) {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      return;
    }
    loggedInUser = user;
    await route.fulfill({ json: { user: sanitizeUser(loggedInUser), token: 'abcdef' } });
  });

  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: loggedInUser ? sanitizeUser(loggedInUser) : null });
  });

  await page.route('*/**/api/order/menu', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: options.menu ?? defaultMenu });
  });

  await page.route(/\/api\/franchise(.*)$/, async (route) => {
    const method = route.request().method();
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (method === 'GET' && /\/api\/franchise$/.test(path)) {
      await route.fulfill({ json: defaultFranchises });
      return;
    }

    if (method === 'GET' && /\/api\/franchise\/.+/.test(path)) {
      await route.fulfill({ json: defaultFranchiseDetails });
      return;
    }

    if (method === 'POST' && /\/api\/franchise$/.test(path)) {
      const body = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: body });
      return;
    }

    if (method === 'POST' && /\/api\/franchise\/.+\/store$/.test(path)) {
      const body = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: body });
      return;
    }

    if (method === 'DELETE' && /\/api\/franchise\/.+\/store\/.+/.test(path)) {
      await route.fulfill({ status: 204, json: {} });
      return;
    }

    if (method === 'DELETE' && /\/api\/franchise\/.+/.test(path)) {
      await route.fulfill({ status: 204, json: {} });
      return;
    }

    await route.fulfill({ status: 404, json: { message: 'Unhandled franchise route' } });
  });

  await page.route('*/**/api/order', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ json: defaultOrderHistory });
      return;
    }

    expect(method).toBe('POST');
    const orderReq = route.request().postDataJSON() as Order;
    if (options.orderError) {
      await route.fulfill({ status: options.orderError.status ?? 500, json: { message: options.orderError.message } });
      return;
    }
    const defaultOrderResponse = {
      order: { ...orderReq, id: options.orderResponse?.order.id ?? '23' },
      jwt: options.orderResponse?.jwt ?? 'eyJpYXQ',
    };
    await route.fulfill({ json: options.orderResponse ?? defaultOrderResponse });
  });

  await page.route('*/**/api/docs', async (route) => {
    await route.fulfill({ json: defaultDocs });
  });

  await page.route('*/**/api/order/verify', async (route) => {
    if (options.verifyError) {
      await route.fulfill({ status: options.verifyError.status ?? 400, json: { message: options.verifyError.message, payload: options.verifyError.payload } });
      return;
    }
    await route.fulfill({ json: options.verifyResponse ?? { message: 'valid', payload: { status: 'ok' } } });
  });

  await page.goto('/');
}
