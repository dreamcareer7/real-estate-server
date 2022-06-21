#!/usr/bin/env/node

const createContext = require('../workers/utils/create-context')
const sql = require('../../lib/utils/sql')

const query = `
  WITH
  chunk AS (
    SELECT id FROM email_campaigns
    WHERE
      executed_at IS NOT NULL AND
      recipients_count IS NULL
    LIMIT $1::int
    FOR UPDATE SKIP LOCKED
  ),
  recipients_emails AS (
    SELECT
      email,
      campaign
    FROM email_campaigns_recipient_emails
    WHERE email IS NOT NULL
  ),
  recipients_counts AS (
    SELECT
      ch.id AS campaign,
      count(DISTINCT lower(trim(re.email))) AS recipients_count
    FROM chunk AS ch
    LEFT JOIN recipients_emails AS re ON re.campaign = ch.id
    GROUP BY ch.id
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
