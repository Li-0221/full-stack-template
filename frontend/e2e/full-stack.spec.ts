import { z } from 'zod'
import { expect, test } from 'playwright/test'

const adminEmail = process.env.E2E_ADMIN_EMAIL
const adminPassword = process.env.E2E_ADMIN_PASSWORD

if (!adminEmail || !adminPassword) {
  throw new Error(
    'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required for full-stack tests'
  )
}

const sessionResponseSchema = z.object({
  data: z.object({ accessToken: z.string().min(1) }),
})

const userResponseSchema = z.object({
  data: z.object({ id: z.uuid() }),
})

test('signs in and completes the user management workflow', async ({
  page,
  request,
}) => {
  test.setTimeout(60_000)

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const userEmail = `e2e-user-${runId}@example.com`
  const userPassword = `E2e-${crypto.randomUUID()}-Aa1`
  let accessToken: string | undefined
  let createdUserId: string | undefined
  let apiOrigin: string | undefined

  try {
    await page.goto('/sign-in')
    await page.getByLabel('Email').fill(adminEmail)
    await page
      .getByRole('textbox', { name: 'Password', exact: true })
      .fill(adminPassword)

    const loginResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith('/api/v1/auth/session')
    )
    await page.getByRole('button', { name: 'Sign in' }).click()
    const loginResponse = await loginResponsePromise
    expect(loginResponse.ok()).toBe(true)
    accessToken = sessionResponseSchema.parse(await loginResponse.json()).data
      .accessToken

    await expect(page).toHaveURL(/\/$/)
    await page.goto('/users')
    await expect(page.getByRole('heading', { name: 'User List' })).toBeVisible()

    await page.getByRole('button', { name: 'Add user' }).click()
    await page.getByLabel('Full name').fill('E2E User')
    await page.getByLabel('Email').fill(userEmail)
    await page
      .getByRole('textbox', { name: 'Password', exact: true })
      .fill(userPassword)
    await page.getByLabel('Confirm password').fill(userPassword)

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith('/api/v1/users')
    )
    await page.getByRole('button', { name: 'Save user' }).click()
    const createResponse = await createResponsePromise
    expect(createResponse.ok()).toBe(true)
    createdUserId = userResponseSchema.parse(await createResponse.json()).data
      .id
    apiOrigin = new URL(createResponse.url()).origin

    let userRow = page.getByRole('row').filter({ hasText: userEmail })
    await expect(userRow).toBeVisible()
    await userRow
      .getByRole('button', { name: `Open actions for ${userEmail}` })
      .click()
    await page.getByRole('menuitem', { name: 'Edit' }).click()
    await page.getByLabel('Full name').fill('Updated E2E User')
    await page.getByRole('button', { name: 'Save user' }).click()

    userRow = page.getByRole('row').filter({ hasText: userEmail })
    await expect(userRow).toContainText('Updated E2E User')
    await userRow
      .getByRole('button', { name: `Open actions for ${userEmail}` })
      .click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page.getByLabel('Type the email to confirm').fill(userEmail)

    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        response.url().endsWith(`/api/v1/users/${createdUserId}`)
    )
    await page.getByRole('button', { name: 'Delete user' }).click()
    const deleteResponse = await deleteResponsePromise
    expect(deleteResponse.status()).toBe(204)
    createdUserId = undefined
    await expect(userRow).toHaveCount(0)
  } finally {
    if (createdUserId && accessToken && apiOrigin) {
      await request.delete(`${apiOrigin}/api/v1/users/${createdUserId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    }
  }
})
