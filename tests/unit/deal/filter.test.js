const { expect } = require('chai')
const { createContext } = require('../helper')
const DealHelper = require('./helper')
const BrandHelper = require('../brand/helper')

const full_address = '5050 Main Street'

const createDeal = async () => {
  const user = await User.getByEmail('test@rechat.com')

  const brand = await BrandHelper.create({
    roles: {
      Admin: [user.id]
    }
  })
  Context.set({ brand })


  const deal = await DealHelper.create(user.id, brand.id, {
    checklists: [{
      context: {
        full_address: {
          value: full_address
        }
      }
    }]
  })

  return { deal, brand, user }
}


const byBrand = async () => {
  const { deal, user } = await createDeal()

  const filter = {
    brand: deal.brand
  }

  const found = await Deal.filter({
    filter,
    user
  })

  expect(found).to.deep.include(deal)
}

const byRole = async () => {
  const { deal, user } = await createDeal()

  const filter = {
    role: {
      user: [user.id]
    }
  }

  let found = await Deal.filter({
    filter,
    user
  })

  expect(found).not.to.deep.include(deal)

  await Deal.addRole({
    role: 'BuyerAgent',
    legal_first_name: user.first_name,
    legal_last_name: user.last_name,
    user: user.id,
    deal: deal.id,
    created_by: user.id
  })

  found = await Deal.filter({
    filter,
    user
  })

  const ids = found.map(d => d.id)

  expect(ids).to.include(deal.id)
}

const byPrimaryAgent = async () => {
  const { deal, user } = await createDeal()

  const filter = {
    role: {
      user: [user.id],
      is_primary_agent: true
    }
  }

  let found = await Deal.filter({
    filter,
    user
  })

  expect(found).not.to.deep.include(deal)

  await Deal.addRole({
    role: 'BuyerAgent',
    legal_first_name: user.first_name,
    legal_last_name: user.last_name,
    user: user.id,
    deal: deal.id,
    created_by: user.id
  })

  found = await Deal.filter({
    filter,
    user
  })

  const ids = found.map(d => d.id)

  expect(ids).to.include(deal.id)
}

const byContextQuery = async () => {
  const { deal, user } = await createDeal()

  const filter = {
    brand: deal.brand,
    query: full_address
  }

  const found = await Deal.filter({
    filter,
    user
  })

  expect(found).to.deep.include(deal)
}

const byRoleQuery = async () => {
  const { deal, user } = await createDeal()

  await Deal.addRole({
    role: 'BuyerAgent',
    legal_first_name: user.first_name,
    legal_last_name: user.last_name,
    user: user.id,
    deal: deal.id,
    created_by: user.id
  })

  const filter = {
    brand: deal.brand,
    query: user.display_name
  }

  const found = await Deal.filter({
    filter,
    user
  })

  const ids = found.map(d => d.id)

  expect(ids).to.include(deal.id)
}

describe('Deal Filter', () => {
  createContext()

  it('filter by brand', byBrand)
  it('filter by role', byRole)
  it('filter by primary agent', byPrimaryAgent)
  it('filter by query in context', byContextQuery)
  it('filter by query in role', byRoleQuery)
})
