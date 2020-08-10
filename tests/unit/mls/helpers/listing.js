const { Listing } = require('../../../../lib/models/Listing')
const promisify = require('../../../../lib/utils/promisify')

const listing  = require('../json/listing.json')
const property = require('../json/property.json')
const address  = require('../json/address.json')

const create = async () => {
  const result = await promisify(Listing.create)({
    listing,
    property,
    address,
    revision: 1
  })

  return result.listing
}

module.exports = { create }
