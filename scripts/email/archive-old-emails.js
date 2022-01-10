#!/usr/bin/env node

const MLSJob = require('../../lib/models/MLSJob')
const sql = require('../../lib/utils/sql')
const archive = require('../../lib/models/Email/archive/upload')
const { runInContext } = require('../../lib/models/Context/util')
const promisify = require('../../lib/utils/promisify')
const Context = require('../../lib/models/Context')

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))


const defaultTtime = '1970-01-01T00:00:00'

let totalCount = 0

let lastEmailDate = ''

const queueEmails = async () => {

  const [lastJob] = await promisify(MLSJob.getLastRun)('archive_old_emails')
  lastEmailDate = lastJob?.last_modified_date

  const time = lastEmailDate || defaultTtime

  const query = `SELECT id, created_at
    FROM emails
    WHERE
      (html IS NOT NULL OR text IS NOT NULL)
      AND (mailgun_id IS NOT NULL OR google_id IS NOT NULL OR microsoft_id IS NOT NULL)
      AND (created_at::timestamptz > $1::timestamptz)
    ORDER BY created_at ASC
    LIMIT 1000
  `

  const emails = await sql.select(query, [time])
  const emailsCount = emails.length

  if (!emailsCount){
    Context.log(`all emails queued to be archived! total: ${totalCount} emails`)
    return 0
  }

  for (let i = 0; i < emailsCount; i++) {
    await archive(emails[i].id)
  }

  await promisify(MLSJob.insert)(
    {
      name: 'archive_old_emails',
      last_modified_date: emails[emailsCount - 1].created_at,
    }
  )

  totalCount += emailsCount

  return emailsCount
}

runInContext(`archive-old-emails-${new Date().toLocaleTimeString('en-us')}`, async () => {
  let count = 0
  do {
    count = await queueEmails()
    await sleep(1000 * 3600 / 2)
  } while (count)
})
