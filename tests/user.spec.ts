import { test, expect } from 'playwright-test-coverage';
import { basicInit } from './utils/basicInit';

test('updateUser persists diner updates', async ({ page }) => {
  await basicInit(page);

  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: /full name/i }).fill('pizza diner');
  await page.getByRole('textbox', { name: /email address/i }).fill(email);
  await page.getByRole('textbox', { name: /password/i }).fill('diner');
  await page.getByRole('button', { name: /register/i }).click();

  await page.getByRole('link', { name: /^pd$/i }).click();
  await expect(page.getByRole('main')).toContainText('pizza diner');

  const editBtn =
    (await page.getByRole('button', { name: /edit/i }).first().isVisible())
      ? page.getByRole('button', { name: /edit/i }).first()
      : page.getByRole('link', { name: /edit/i }).first();
  await editBtn.click();

  await expect(page.locator('h3')).toContainText(/edit user/i);

  const nameInput = page.getByRole('textbox', { name: /name/i });
  if (await nameInput.isVisible()) {
    await nameInput.fill('pizza dinerx');
  } else {
    await page.locator('#hs-jwt-modal').getByRole('textbox').first().fill('pizza dinerx');
  }

  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes('/api/user/') &&
        r.request().method() === 'PUT' &&
        r.ok()
    ),
    (async () => {
      const updateBtn =
        (await page.getByRole('button', { name: /update/i }).isVisible())
          ? page.getByRole('button', { name: /update/i })
          : page.getByRole('link', { name: /update/i });
      await updateBtn.click();
    })(),
  ]);
  await page.locator('#hs-jwt-modal').waitFor({ state: 'hidden' });

  await expect(page.getByRole('main')).toContainText('pizza dinerx');

  await page.getByRole('link', { name: /logout/i }).click();
  await page.getByRole('link', { name: /login/i }).click();
  await page.getByRole('textbox', { name: /email address/i }).fill(email);
  await page.getByRole('textbox', { name: /password/i }).fill('diner');
  await page.getByRole('button', { name: /login/i }).click();

  await page.getByRole('link', { name: /^pd$/i }).click();
  await expect(page.getByRole('main')).toContainText('pizza dinerx');
});
