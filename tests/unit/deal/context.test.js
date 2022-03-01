const { expect } = require('chai')
const { createContext } = require('../helper')
const DealHelper = require('./helper')
const BrandHelper = require('../brand/helper')
const ListingHelper = require('../mls/helpers/listing')
const promisify = require('../../../lib/utils/promisify')
const Context = require('../../../lib/models/Context')
const Deal = require('../../../lib/models/Deal')
const User = require('../../../lib/models/User/get')


const manualContext = async () => {
  const street_address = '12345 Munger Avenue'

  const user = await User.getByEmail('test@rechat.com')

  const brand = await BrandHelper.create()
  Context.set({ brand })

  const deal = await DealHelper.create(user.id, brand.id, {
    deal_type: 'Selling',
    checklists: [{
      context: {
        street_address: {
          value: street_address
        }
      }
    }]
  })

  expect(deal.context.street_address.text).to.equal(street_address)
}

const mlsContext = async () => {
  const listing = await ListingHelper.create()

  const user = await User.getByEmail('test@rechat.com')

  const brand = await BrandHelper.create()
  Context.set({ brand })

  const deal = await DealHelper.create(user.id, brand.id, {
    listing: listing.id,
    deal_type: 'Selling',
    checklists: [{}] // We need it to create a checklist so there's a contexts activated
  })

  expect(deal.context.street_address.text).to.equal(listing.property.address.street_address)
}

const updateContext = async () => {
  const street_address = '12345 Munger Avenue'

  const user = await User.getByEmail('test@rechat.com')

  const brand = await BrandHelper.create()
  Context.set({ brand })

  const deal = await DealHelper.create(user.id, brand.id, {
    deal_type: 'Selling',
    checklists: [{
      context: {
        street_address: {
          value: street_address
        }
      }
    }]
  })

  expect(deal.context.street_address.text).to.equal(street_address)

  const listing = await ListingHelper.create()

  await Deal.update({
    ...deal,
    listing: listing.id
  })

  const updated = await promisify(Deal.get)(deal.id)

  expect(updated.context.street_address.text).not.to.equal(street_address)
  expect(updated.context.street_address.text).to.equal(listing.property.address.street_address)
}

describe('Deal Context', () => {
  createContext()

  it('should create a deal with manual context', manualContext)
  it('should create a deal with mls context', mlsContext)
  it('set listing for a deal and expect it to update context', updateContext)
})

