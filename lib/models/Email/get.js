const db = require('../../utils/db')


const getAll = async ids => {
  return db.select('email/get', [ids])
}

const get = async id => {
  const emails = await getAll([id])

  if (emails.length < 1)
    throw Error.ResourceNotFound(`Email ${id} not found`)

  return emails[0]
}

const getByGoogleMessageIds = async (message_ids) => {
  return await db.selectIds('email/get_by_google_message_id', [message_ids])
}

const getByMicrosoftMessageIds = async (message_ids) => {
  return await db.selectIds('email/get_by_microsoft_message_id', [message_ids])
}


module.exports = { get, getAll, getByMicrosoftMessageIds, getByGoogleMessageIds }