import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 10 }, // Ramp up to 10 users
    { duration: '30s', target: 10 }, // Stay at 10 users
    { duration: '10s', target: 0 },  // Ramp down to 0
  ],
};

export default function () {
  const BASE_URL = 'https://pizza-service.cs329stevenpizza.click';
  const FACTORY_URL = 'https://pizza-factory.cs329.click';

  const headers = {
    'Content-Type': 'application/json',
  };

  // --- 0. Dynamic User Generation ---
  // Create unique credentials for each iteration to ensure success
  const uniqueId = `${__VU}-${__ITER}-${Date.now()}`;
  const email = `user${uniqueId}@test.com`;
  const password = 'password123';
  const name = `Test User ${uniqueId}`;

  // --- 1. Register (Create the user) ---
  const registerPayload = JSON.stringify({ name, email, password });
  const registerRes = http.post(`${BASE_URL}/api/auth`, registerPayload, { headers });
  
  check(registerRes, {
    'Register successful (200)': (r) => r.status === 200,
  });

  // --- 2. Login ---
  const loginPayload = JSON.stringify({ email, password });
  const loginRes = http.put(`${BASE_URL}/api/auth`, loginPayload, { headers });

  check(loginRes, {
    'Login successful (200)': (r) => r.status === 200,
    // stricter check to avoid false positives
    'Auth token received': (r) => r.json('token') !== undefined && r.json('token') !== '',
  });

  const authToken = loginRes.json('token');
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  // --- 3. Navigate Menu & Get Franchise Info ---
  const menuRes = http.get(`${BASE_URL}/api/order/menu`, { headers: authHeaders });
  check(menuRes, {
    'Menu retrieved (200)': (r) => r.status === 200,
  });

  const franchiseRes = http.get(`${BASE_URL}/api/franchise`, { headers: authHeaders });
  check(franchiseRes, {
    'Franchises retrieved (200)': (r) => r.status === 200,
  });

  const franchises = franchiseRes.json('franchises');
  let franchiseId = 1;
  let storeId = 1;

  if (franchises && franchises.length > 0) {
    franchiseId = franchises[0].id;
    if (franchises[0].stores && franchises[0].stores.length > 0) {
      storeId = franchises[0].stores[0].id;
    }
  }

  // --- 4. Buy Pizza ---
  const orderPayload = JSON.stringify({
    items: [{ menuId: 1, description: 'Veggie', price: 0.0038 }],
    storeId: storeId,
    franchiseId: franchiseId,
  });

  const orderRes = http.post(`${BASE_URL}/api/order`, orderPayload, { headers: authHeaders });

  check(orderRes, {
    'Order successful (200)': (r) => r.status === 200,
    'Pizza JWT received': (r) => r.json('jwt') !== undefined,
  });

  // --- 5. Validate Pizza JWT (Dynamic) ---
  const pizzaJwt = orderRes.json('jwt');
  const verifyPayload = JSON.stringify({ jwt: pizzaJwt });

  const verifyRes = http.post(`${FACTORY_URL}/api/order/verify`, verifyPayload, { headers: authHeaders });

  check(verifyRes, {
    'Verification request successful (200)': (r) => r.status === 200,
    'Pizza is valid': (r) => r.json('message') === 'valid',
  });

  sleep(1);
}