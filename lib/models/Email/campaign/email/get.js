const db = require('../../../../utils/db')


const getAll = async ids => {
  return db.select('email/campaign/email/get', [ids])
}

const get = async id => {
  const emails = await getAll([id])

  if (emails.length < 1)
    throw Error.ResourceNotFound(`Campaign email ${id} not found`)

  return emails[0]
}

const getByEmails = async emails => {
  const ids = await db.selectIds('email/campaign/email/get_by_emails', [emails])

  if (ids.length < 1) {
    return []
  }

  return await getAll(ids)
}

const getByEmail = async email => {
  const records = await getByEmails([email])

  if (records.length < 1) {
    throw Error.ResourceNotFound(`Campaign email ${email} not found`)
  }

  return records[0]
}

const find = async (campaign_id, email_address) => {
  const id = await db.selectId('email/campaign/email/find', [
    campaign_id,
    email_address
  ])

  return get(id)
}

module.exports = { get, getAll, getByEmail, getByEmails, find }
