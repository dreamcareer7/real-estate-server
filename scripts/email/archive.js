const timers = require('timers/promises')
const sql = require('../../lib/utils/sql')
const { runInContext } = require('../../lib/models/Context/util')
const { peanar } = require('../../lib/utils/peanar')
const archive = require('../../lib/models/Email/archive/upload')

const query = `
  SELECT id FROM emails WHERE html IS NOT NULL OR text IS NOT NULL LIMIT 10000
`

async function archiveEmails() {
  const ids = await sql.selectIds(query, [])

  for (const id of ids) {
    await archive(id)
  }
}

async function main() {
  await peanar.declareAmqResources()

  let counter = 1
  await runInContext(`EmailArchive-${counter}`, archiveEmails, undefined, { exitAfterFinish: false })
  await timers.setTimeout(60 * 1000)

  await peanar.shutdown()
}

main().catch(ex => console.error(ex)).finally(process.exit())
