import { z } from 'zod'
import { expect, test, type Page } from 'playwright/test'

const adminEmail = process.env.E2E_ADMIN_EMAIL
const adminPassword = process.env.E2E_ADMIN_PASSWORD
if (!adminEmail || !adminPassword) {
  throw new Error('E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required')
}

const tokensSchema = z.object({
  data: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    accessExpiresAt: z.number(),
  }),
})

async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel('Email').fill(email)
  await page
    .getByRole('textbox', { name: 'Password', exact: true })
    .fill(password)
  const response = page.waitForResponse(
    (item) =>
      item.request().method() === 'POST' &&
      item.url().endsWith('/api/v1/auth/session')
  )
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const login = await response
  expect(login.ok()).toBe(true)
  return {
    origin: new URL(login.url()).origin,
    tokens: tokensSchema.parse(await login.json()).data,
  }
}

test('switching from administrator to ordinary user discards cached permissions', async ({
  page,
  request,
}) => {
  await page.goto('/sign-in')
  const admin = await signIn(page, adminEmail, adminPassword)
  const email = `session-${crypto.randomUUID()}@example.com`
  const password = `Test-${crypto.randomUUID()}`
  const headers = { Authorization: `Bearer ${admin.tokens.accessToken}` }
  const created = await request.post(`${admin.origin}/api/v1/users`, {
    headers,
    data: { email, password, fullName: 'Session Test', isSuperuser: false },
  })
  expect(created.status()).toBe(201)
  const userId = z
    .object({ data: z.object({ id: z.uuid() }) })
    .parse(await created.json()).data.id
  try {
    await page.getByRole('link', { name: 'Users', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'User List' })).toBeVisible()
    await page.getByRole('button').filter({ hasText: adminEmail }).click()
    await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click()
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Sign out', exact: true })
      .click()
    await expect(page).toHaveURL(/\/sign-in/)
    await signIn(page, email, password)
    await expect(page).toHaveURL(/\/403$/)
    await expect(page.getByRole('heading', { name: 'User List' })).toHaveCount(
      0
    )
    await expect(page.getByText(adminEmail, { exact: true })).toHaveCount(0)
  } finally {
    await request.delete(`${admin.origin}/api/v1/users/${userId}`, { headers })
  }
})

test('an actually expired access token rotates the refresh token and retries the request', async ({
  page,
}) => {
  test.skip(
    process.env.E2E_VERIFY_REFRESH !== '1',
    'Requires a backend with APP_ACCESS_TOKEN_EXPIRE_MINUTES=1'
  )
  test.setTimeout(100_000)
  await page.goto('/sign-in')
  const { tokens } = await signIn(page, adminEmail, adminPassword)
  await expect(
    page.getByRole('link', { name: 'Users', exact: true })
  ).toBeVisible()
  const wait = Math.max(0, tokens.accessExpiresAt - Date.now() + 1000)
  expect(wait).toBeLessThanOrEqual(65_000)
  await page.waitForTimeout(wait)
  const refreshed = page.waitForResponse(
    (item) =>
      item.url().endsWith('/api/v1/auth/session/refresh') &&
      item.status() === 200
  )
  const users = page.waitForResponse(
    (item) =>
      new URL(item.url()).pathname === '/api/v1/users' &&
      item.request().method() === 'GET' &&
      item.status() === 200
  )
  await page.getByRole('link', { name: 'Users', exact: true }).click()
  const after = tokensSchema.parse(await (await refreshed).json()).data
  expect(after.refreshToken).not.toBe(tokens.refreshToken)
  expect(after.accessToken).not.toBe(tokens.accessToken)
  expect((await users).request().headers()['authorization']).toBe(
    `Bearer ${after.accessToken}`
  )
  await expect(page.getByRole('heading', { name: 'User List' })).toBeVisible()
})
