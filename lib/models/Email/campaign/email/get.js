const db = require('../../../../utils/db')

const get = async id => {
  const emails = await getAll([id])

  if (emails.length < 1)
    throw Error.ResourceNotFound(`Campaign email ${id} not found`)

  return emails[0]
}

const getAll = async ids => {
  return db.select('email/campaign/email/get', [ids])
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
    return null
  }

  return records[0]
}

module.exports = { get, getAll, getByEmail, getByEmails }
