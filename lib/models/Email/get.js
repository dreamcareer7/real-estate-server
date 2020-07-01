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

module.exports = { get, getAll }
