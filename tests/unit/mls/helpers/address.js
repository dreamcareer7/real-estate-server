const json = require('../json/address')

const create = async () => {
  const id = await Address.create(json)
  const address = await Address.get(id)

  return address
}

module.exports = { create }
