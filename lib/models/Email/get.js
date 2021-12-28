const db = require('../../utils/db')
// const Orm = require('../Orm/context')
// const download = require('./archive/download')

const getAll = async ids => {
  const emails = await db.select('email/get', [ids])

  // const { select } = Orm.getPublicFields()

  // if (select?.email?.includes?.('html')) {
  //   for (const email of emails) {
  //     email.html = await download(`${email.id}.html`)
  //   }
  // }

  // if (select?.email?.includes?.('text')) {
  //   for (const email of emails) {
  //     email.text = await download(`${email.id}.txt`)
  //   }
  // }

  return emails
}

const get = async id => {
  const emails = await getAll([id])

  if (emails.length < 1) {
    throw Error.ResourceNotFound(`Email ${id} not found`)
  }

  return emails[0]
}

const getByGoogleMessageIds = async (message_ids) => {
  return await db.selectIds('email/get_by_google_message_id', [message_ids])
}

const getByMicrosoftMessageIds = async (message_ids) => {
  return await db.selectIds('email/get_by_microsoft_message_id', [message_ids])
}

const getByMailgunId = async (mailgun_id) => {
  const ids = await db.selectIds('email/get_by_mailgun_id', [mailgun_id])

  if ( ids.length === 0 ) {
    throw Error.ResourceNotFound(`Email by mailgun_id: ${mailgun_id} not found`)
  }

  return ids[0]
}

module.exports = {
  get,
  getAll,
  getByMicrosoftMessageIds,
  getByGoogleMessageIds,
  getByMailgunId
}
