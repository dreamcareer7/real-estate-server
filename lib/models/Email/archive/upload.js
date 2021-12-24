const { PassThrough } = require('stream')

const { peanar } = require('../../../utils/peanar')
const db = require('../../../utils/db')

const upload = require('../../AttachedFile/upload')
const Email = require('../get')
const getKey = require('./key')

/**
 * @param {string | null} text
 * @param {string} name
 */
async function uploadEmailContent(text, name) {
  if (!text) return

  const key = getKey(name)
  const stream = new PassThrough()
  stream.end(Buffer.from(text))

  await upload.promise({
    key,
    mime: 'text/plain',
    stream,
    name,
    public: false,
  })
}

/**
 * @param {UUID} email_id
 */
async function archiveEmailContent(email_id) {
  const email = await Email.get(email_id)

  await Promise.all([
    uploadEmailContent(email.html, `${email_id}.html`),
    uploadEmailContent(email.text, `${email_id}.txt`),
  ])

  await db.update('email/clear_body', [email_id])
}

const archive = peanar.job({
  handler: archiveEmailContent,
  queue: 'email_archive',
  error_exchange: 'email_archive.error',
  retry_exchange: 'email_archive.retry',
  retry_delay: 10000,
  max_retries: 10,
  exchange: 'email_archive',
  name: 'email/archive_content',
})

module.exports = archive
