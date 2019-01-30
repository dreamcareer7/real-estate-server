const { expect } = require('chai')
const { createContext } = require('../helper')
const DealHelper = require('./helper')
const BrandHelper = require('../brand/helper')
const promisify = require('../../../lib/utils/promisify')

const createDeal = async () => {
  const user = await User.getByEmail('test@rechat.com')

  const brand = await BrandHelper.create({
    roles: {
      Admin: [user.id]
    }
  })
  Context.set({ brand })


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

  const user = await User.get(deal.created_by)

  await promisify(Deal.limitAccess)({
    user,
    deal_id: deal.id
  })

  const another = await User.getByEmail('test+email@rechat.com')

  let errored = false
  try {
    await promisify(Deal.limitAccess)({
      user: another,
      deal_id: deal.id
    })
  } catch(e) {
    errored = true
    expect(e.http).to.equal(403)
  }

  expect(errored).to.be.true

  let access = await Deal.hasAccessToDeals(user.id, [deal])
  expect(access[deal.id]).to.be.true

  access = await Deal.hasAccessToDeals(another.id, [deal])
  expect(access[deal.id]).to.be.false
}

const liveUpdate = async() => {
  const deal = await createDeal()

  await Deal.notify({deal})
  await Deal.notifyById(deal.id)
}

describe('Deal Misc', () => {
  createContext()

  it('should be among deals of a brand', brandDeals)
  it('should be among deals of a user who has access to it', userDeals)
  it('should not throw an error on a live update', liveUpdate)
})
