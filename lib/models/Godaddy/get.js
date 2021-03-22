const db = require('../../utils/db')

const get = async id => {
  const domains = await getAll([id])

  if (domains.length < 1)
    throw new Error.ResourceNotFound(`Cannot find domain ${id}`)

  return domains[0]
}

const getAll = async ids => {
  return db.select('godaddy/domain/get', [ids])
}

module.exports = {
  get,
  getAll
}
