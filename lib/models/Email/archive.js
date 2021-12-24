const { PassThrough } = require('stream')

const { peanar } = require('../../utils/peanar')
const db = require('../../utils/db')

const AttachedFile = require('../AttachedFile/index')
const upload = require('../AttachedFile/upload')

const { get } = require('./get')

/**
 * @param {string} name 
 */
function getKey(name) {
  return `emails/${name[0]}/${name.slice(0, 4)}/${name}`
}

/**
 * @param {string | null} text 
 * @param {string} name 
 */
async function uploadEmailContent(text, name) {
  if (!text) return

  const key = getKey(name)
  const stream = new PassThrough()
  stream.end(Buffer.from(text))

  await upload({
    key,
    mime: 'text/plain',
    stream,
    name,
    public: false
  })
}

/**
 * @param {UUID} email_id 
 */
async function archiveEmailContent(email_id) {
  const email = await get(email_id)

  await Promise.all([
    uploadEmailContent(email.html, `${email_id}.html`),
    uploadEmailContent(email.text, `${email_id}.txt`)
  ])

  await db.update('email/clear_body', [ email_id ])
}

/**
 * @param {string} name
 */
async function download(name) {
  const path = getKey(name)
  try {
    return await AttachedFile.downloadAsString({ public: false, path })
  } catch {
    return null
  } 
}


const archive = peanar.job({
  handler: archiveEmailContent,
  queue: 'email_archive',
  error_exchange: 'email_archive.error',
  retry_exchange: 'email_archive.retry',
  retry_delay: 10000,
  max_retries: 10,
  exchange: 'email_archive',
  name: 'email/archive_content'
})

module.exports = {
  archive,
  download
}
