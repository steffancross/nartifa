// Creates an admin account, or resets its password if the email already exists (Build Spec 01).
// One account per person (Steffan, the artist): run it once for each. See docs/Admin Accounts.md.
//
//   pnpm seed-admin          local database (.wrangler/state)
//   pnpm seed-admin:remote   real D1
//
// Asks for the email and password. Never deletes an account and never touches other accounts.
import { stdin, stdout } from 'node:process'
import readline from 'node:readline'
import { getPayload } from 'payload'
import config from '@payload-config'

const MIN_PASSWORD_LENGTH = 12

// Ask before Payload starts, so its log lines don't land in the middle of the prompts.
// Reads through the line iterator, which buffers, so piped input can't skip a prompt
const rl = readline.createInterface({ input: stdin, output: stdout })
const lines = rl[Symbol.asyncIterator]()
const ask = async (prompt: string) => {
  // setPrompt, so readline redraws the right label after a backspace
  rl.setPrompt(prompt)
  rl.prompt()
  const { value } = await lines.next()
  return (value ?? '') as string
}
const email = (await ask('Email: ')).trim().toLowerCase()
const password = await ask('Password: ')
rl.close()

if (!email || !password) {
  console.error('Email and password are both needed.')
  process.exit(1)
}
if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(`The password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
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
