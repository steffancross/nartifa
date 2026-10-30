// Creates an admin account, or resets its password if the email already exists (Build Spec 01).
// One account per person (Steffan, the artist): run it once for each. See docs/Admin Accounts.md.
//
//   ADMIN_EMAIL=… ADMIN_PASSWORD=… pnpm seed-admin          local database (.wrangler/state)
//   ADMIN_EMAIL=… ADMIN_PASSWORD=… pnpm seed-admin:remote   real D1
//
// Never deletes an account and never touches other accounts.
import { getPayload } from 'payload'
import config from '@payload-config'

const MIN_PASSWORD_LENGTH = 12

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD

if (!email || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD.')
  process.exit(1)
}
if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  process.exit(1)
}

const payload = await getPayload({ config })
// Scripts run outside a Next.js request, where revalidateTag doesn't work (Build Spec 08)
const context = { skipRevalidate: true }

const { docs } = await payload.find({
  collection: 'users',
  where: { email: { equals: email } },
  limit: 1,
  context,
})

if (docs[0]) {
  await payload.update({ collection: 'users', id: docs[0].id, data: { password }, context })
  // Clears a lockout from too many wrong passwords, so a reset always lets the person back in.
  // unlock only reads the email; the generated type also asks for the password
  await payload.unlock({ collection: 'users', data: { email, password }, overrideAccess: true })
  console.log(`Password reset for ${email}.`)
} else {
  await payload.create({ collection: 'users', data: { email, password }, context })
  console.log(`Account created for ${email}.`)
}

const { totalDocs } = await payload.count({ collection: 'users' })
console.log(`Accounts in this database: ${totalDocs}.`)
