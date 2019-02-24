const promisify = require('../../../../lib/utils/promisify')

const listing = require('../json/listing')
const property = require('../json/property')
const address = require('../json/address')

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
