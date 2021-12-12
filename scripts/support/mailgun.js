const Context = require('../../lib/models/Context/index')
const Email = require('../../lib/models/Email/index')
const sql = require('../../lib/utils/sql')
const createContext = require('../workers/utils/create-context')

const CAMPAIGN_ID = 'ff43b328-cb60-11ea-8e74-1650ce91b517'

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms))
}

async function execute(limit = 1010) {
  const ids = await sql.selectIds('select id from emails where campaign = $1 AND mailgun_id IS NULL LIMIT $2', [CAMPAIGN_ID, limit])

  for (let i = 0; i < ids.length; i += 1000) {
    await send(ids.slice(i, i + 1000))
    await sleep(1000)
  }
}

async function send(ids) {
  const emails = await Email.getAll(ids)
  
  for (const email of emails) {
    Context.log('Queueing email to', email.to)
    await Email.lowPriority.immediate(email)
  }
}

async function main() {
  const { commit, run } = await createContext({
    id: `support-campaign-${CAMPAIGN_ID}`
  })

  await run(async () => {
    await execute(parseInt(process.argv[2] || '15000'))
    await commit()
  })
}

main().catch(ex => {
  console.error(ex)
})
