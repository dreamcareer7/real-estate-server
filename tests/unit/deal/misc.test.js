const { expect } = require('chai')
const { createContext } = require('../helper')
const DealHelper = require('./helper')
const BrandHelper = require('../brand/helper')
const promisify = require('../../../lib/utils/promisify')

const createDeal = async () => {
  const brand = await BrandHelper.create()
  Context.set({ brand })

  const user = await User.getByEmail('test@rechat.com')

  const deal = await DealHelper.create(user.id, brand.id, {})

  return deal
}

const brandDeals = async () => {
  const deal = await createDeal()

  let deals = await promisify(Deal.getBrandDeals)(deal.brand)
  let found = deals.some(d => d.id === deal.id)
  expect(found).to.be.true

  await promisify(Deal.delete)(deal.id)

  deals = await promisify(Deal.getBrandDeals)(deal.brand)
  found = deals.some(d => d.id === deal.id)
  expect(found).to.be.false
}

const userDeals = async () => {
  const deal = await createDeal()

  let deals = await promisify(Deal.getUserDeals)(deal.created_by)
  let found = deals.some(d => d.id === deal.id)
  expect(found).to.be.true

  await promisify(Deal.delete)(deal.id)

  deals = await promisify(Deal.getUserDeals)(deal.brand)
  found = deals.some(d => d.id === deal.id)
  expect(found).to.be.false
}

describe('Deal', () => {
  createContext()

  it('should be among deals of a brand', brandDeals)
  it('should be among deals of a user',  userDeals)
})
