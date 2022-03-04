const db = require('../../utils/db')
const squel = require('../../utils/squel_extensions')


/**
 * Store the sent_at and mailgun_id in email table.
 * @param {Object} mailgun response - email meta data after sending the email
 * @param {string} mailgun.emailID - email ID
 * @param {string} mailgun.mailgun_id - Unique identifier from microsoft for the message 
 * @param {number} mailgun.sent_at - The date and time the message was sent in UNIX timestamp
 */
const storeMailgunResponse = async ({emailID, mailgun_id, sent_at}) => {
  const trimmed = mailgun_id.replace(/^</, '').replace(/>$/, '')
  await db.query.promise('email/store_mailgun_info', [emailID, trimmed, sent_at])
}

/**
 * Store the sent_at and google_id in email table.
 * @param {Object} google response - email meta data after sending the email
 * @param {string} google.emailID - email ID
 * @param {string} google.google_id - Unique identifier from microsoft for the message 
 * @param {number} google.sent_at - The date and time the message was sent in UNIX timestamp
 */

const storeGoogleInfo = async ({emailID, google_id, sent_at}) => {
  await db.query.promise('email/store_google_info', [emailID, google_id, sent_at])
}

 
/**
 * @deprecated this method is not used anywhere
*/
const storeMicrosoftId = async (id, microsoft_id) => {
  await db.query.promise('email/store_microsoft_id', [id, microsoft_id])
}

/**
 * Store the sent_at and microsoft_id in email table.
 * @param {Object[]} records - email meta data after sending the email
 * @param {string} records[].id - email id in DB
 * @param {string} records[].microsoft_id - Unique identifier from microsoft for the message 
 * @param {Date} records[].sent_at - The date and time the message was sent in UTC
 */

const storeMicrosoftResponse = async (records) => {
  // 
  if (records.length === 0) {
    return []
  }

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    // squel is SQL query builder.
    // for more information check https://www.npmjs.com/package/squel
    // however rechat has forked this library @rechat/squel

    const q = squel
      .update()
      .withValues('update_values', chunk)
      .table('emails', 'e')
      .set('microsoft_id = uv.microsoft_id')
      .set('sent_at = uv.sent_at::timestamp with time zone')
      .from('update_values', 'uv')
      .where('e.id = uv.id::uuid')

    q.name = 'email/store_microsoft_ids'

    return db.update(q, [])
  })  
}


module.exports = { storeMailgunResponse, storeGoogleInfo, storeMicrosoftId, storeMicrosoftResponse }