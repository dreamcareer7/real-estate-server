const { expect } = require('chai')
const { createContext } = require('../helper')
const DealHelper = require('./helper')
const BrandHelper = require('../brand/helper')
const promisify = require('../../../lib/utils/promisify')

const setupBrand = async () => {
    const brand = await BrandHelper.create()
    Context.set({ brand })
}


const dealWithNoTitle = async () => {
  const user = await User.getByEmail('test@rechat.com')

  const brand = Brand.getCurrent()
  const deal = await DealHelper.create(user.id, brand.id, {})

  expect(deal.title).to.equal('[Draft]')

  return deal
}

const roles = [
  {
    role: 'Buyer',
    legal_first_name: 'John',
    legal_middle_name: 'K',
    legal_last_name: 'Smith'
  },
  {
    role: 'Buyer',
    legal_first_name: 'Marry',
    legal_middle_name: 'J',
    legal_last_name: 'Jones'
  },
  {
    role: 'BuyerAgent',
    legal_first_name: 'Trey',
    legal_middle_name: 'J',
    legal_last_name: 'Cooper'
  },
  {
    role: 'Seller',
    legal_first_name: 'Kevin',
    legal_middle_name: 'S',
    legal_last_name: 'Manning'
  },
  {
    role: 'Seller',
    legal_first_name: 'Mark',
    legal_middle_name: 'S',
    legal_last_name: 'Jones'
  },
  {
    role: 'SellerAgent',
    legal_first_name: 'Dan',
    legal_middle_name: 'H',
    legal_last_name: 'Hogan'
  },
]

const buyersTitle = async () => {
  const user = await User.getByEmail('test@rechat.com')

  const brand = Brand.getCurrent()
  const deal = await DealHelper.create(user.id, brand.id, {
    roles,
    deal_type: 'Buying'
  })

  const updated = await Deal.updateTitle(deal)

  // But it should NOT include Sellers as the deal is a buying deal and clients are buyers
  expect(deal.title).to.equal('John K Smith, Marry J Jones')

  return deal
}

const sellersTitle = async () => {
  const user = await User.getByEmail('test@rechat.com')

  const brand = Brand.getCurrent()
  const deal = await DealHelper.create(user.id, brand.id, {
    roles,
    deal_type: 'Selling'
  })

  const updated = await Deal.updateTitle(deal)

  // But it should NOT include Buyers as the deal is a selling deal and clients are sellers
  expect(deal.title).to.equal('Kevin S Manning, Mark S Jones')

  return deal
}

const addressTitle = async () => {
  const street_address = '12345 Munger Avenue'

  const user = await User.getByEmail('test@rechat.com')

  const brand = Brand.getCurrent()

  const deal = await DealHelper.create(user.id, brand.id, {
    roles,
    deal_type: 'Selling',
    checklists: [{
      context: {
        street_address: {
          value: street_address
        }
      }
    }]
  })

  const updated = await Deal.updateTitle(deal)

  expect(updated.title).to.equal(street_address)
}

describe('Deal', () => {
  createContext()
  beforeEach(setupBrand)

  it('should have a draft title', dealWithNoTitle)
  it('should have buyer  names as title', buyersTitle)
  it('should have seller names as title', sellersTitle)
  it('should have manual address as title', addressTitle)
})
