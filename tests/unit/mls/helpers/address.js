const Address = require('../../../../lib/models/Address')
const json = require('../json/address.json')


const create = async () => {
  const id = await Address.create(json)
  const address = await Address.get(id)

  return address
}

module.exports = { create }