const db = require('../../utils/db')

const storeId = async (id, mailgun_id) => {
  const trimmed = mailgun_id.replace(/^</, '').replace(/>$/, '')
  await db.query.promise('email/store-id', [id, trimmed])
}

const storeGoogleId = async (id, google_id) => {
  await db.query.promise('email/store_google_id', [id, google_id])
}

const storeMicrosoftId = async (id, microsoft_id) => {
  await db.query.promise('email/store_microsoft_id', [id, microsoft_id])
}

module.exports = { storeId, storeGoogleId, storeMicrosoftId }
