#!/usr/bin/env/node

const createContext = require('../workers/utils/create-context')
const sql = require('../../lib/utils/sql')

const query = `
  WITH
  chunk AS (
    SELECT * FROM email_campaigns
    WHERE
      executed_at IS NOT NULL AND
      recipients_count IS NULL
    LIMIT $1::int
    FOR UPDATE SKIP LOCKED
  ),
  recipients_counts AS (
    SELECT
      ecre.campaign,
      count(DISTINCT lower(trim(ecre.email))) AS recipients_count
    FROM chunk AS ch
    JOIN email_campaigns_recipient_emails AS ecre ON ecre.campaign = ch.id
    WHERE ecre.email IS NOT NULL
    GROUP BY ecre.campaign
  )
  UPDATE email_campaigns AS ec SET
    recipients_count = rc.recipients_count
  FROM recipients_counts AS rc
  WHERE rc.campaign = ec.id
`

async function calcChunk ({ chunkSize = 1000 } = {}) {
  return sql.update(query, [chunkSize])
}

async function calcRecipientsCount ({ maxIters = 200 } = {}) {
  for (let i = 1; i <= maxIters; ++i) {
    const { run, commit } = await createContext({ id: `calc-recipients-count-${i}` })

    const nUpdated = await run(calcChunk)
    await commit()

    if (nUpdated === 0) { return }
  }
}

if (process.env.NODE_ENV !== 'tests') {
  calcRecipientsCount().then(
    () => process.exit(0),
    err => {
      console.error(err)
      process.exit(1)
    }
  )
}

module.exports = {
  calcRecipientsCount,
  calcChunk,
}
