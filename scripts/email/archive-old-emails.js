#!/usr/bin/env node

const MLSJob = require('../../lib/models/MLSJob')
const sql = require('../../lib/utils/sql')
const archive = require('../../lib/models/Email/archive/upload')
const { runInContext } = require('../../lib/models/Context/util')
const promisify = require('../../lib/utils/promisify')
const Context = require('../../lib/models/Context')

const defaultTtime = '1970-01-01T00:00:00'

const query = `SELECT id, created_at
  FROM emails
  WHERE
    (html IS NOT NULL OR text IS NOT NULL)
    AND (mailgun_id IS NOT NULL OR google_id IS NOT NULL OR microsoft_id IS NOT NULL)
    AND (created_at::timestamptz > $1::timestamptz)
  ORDER BY created_at ASC
  LIMIT 6000
`

runInContext(`archive-old-emails-${new Date().toLocaleTimeString('en-us')}`, async () => {
  Context.set({ 'db:log': true })
  const lastEmailDate = (await promisify(MLSJob.getLastRun)('archive_old_emails'))?.[0]?.last_modified_date
  const time = lastEmailDate || defaultTtime
  const emails = await sql.select(query, [time])
  if (!emails.length) {
    await promisify(MLSJob.insert)(
      {
        name: 'archive_old_emails',
        last_modified_date: time,
        is_initial_completed: true,
      }
    )
  } else {
    for (let i = 0; i < emails.length; i++) {
      await archive(emails[i].id)
    }
    await promisify(MLSJob.insert)(
      {
        name: 'archive_old_emails',
        last_modified_date: emails[emails.length - 1].created_at.toISOString(),
      }
    )
    Context.log(`queued ${emails.length} emails to be archived.`)
  }
})
