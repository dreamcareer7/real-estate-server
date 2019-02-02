const moment = require('moment-timezone')
const { expect } = require('chai')

const { createContext } = require('../helper')

const { Deals: DealsCube } = require('../../../lib/models/Analytics/OLAP/cubes')
const { DealsQueryBuilder } = require('../../../lib/models/Analytics/OLAP')
const Context = require('../../../lib/models/Context')

const BrandHelper = require('../brand/helper')

const createListingWithOffer = require('./data/listing_with_offer')
const createContract = require('./data/contract')
const createListingDeal = require('./data/listing')

const DealsModel = DealsQueryBuilder(DealsCube)

let sellerAgent, buyerAgent, anotherAgent, brand, anotherBrand

async function setup() {
  sellerAgent = await User.getByEmail('test@rechat.com')
  buyerAgent = await User.getByEmail('test+email@rechat.com')
  anotherAgent = await User.getByEmail('guest+foobarbaz@rechat.com')

  brand = await BrandHelper.create({
    roles: {
      Admin: [sellerAgent.id, buyerAgent.id]
    }
  })
  anotherBrand = await BrandHelper.create({
    name: 'Another Brand',
    roles: {
      Admin: [anotherAgent.id]
    }
  })
  Context.set({ user: sellerAgent, brand })
}

async function createDeals() {
  await createListingWithOffer(sellerAgent, buyerAgent, brand, 10018693)
  await createContract(buyerAgent, brand, 11118797)
  await createListingDeal(sellerAgent, brand, 10183366)
}

async function contractsReport(user_id, brand_id) {
  const filter = [
    {
      key: 'deal_type',
      type: 'point',
      point: 'Buying',
      invert: false
    },
    {
      key: 'property_type',
      type: 'set',
      set: ['Residential Lease', 'Commercial Lease'],
      invert: true
    },
    {
      key: 'contract_date',
      type: 'range',
      high: moment().unix(),
      low: moment()
        .add(-7, 'days')
        .startOf('day')
        .unix()
    }
  ]

  const queryBuilder = new DealsModel(null, filter, user_id, brand_id)
  const options = {
    fields: [
      'title',
      'buyer_agent',
      'branch_title',
      'sales_price',
      'closing_date',
      'seller_agent',
      'buyers'
    ],
    order: 'contract_date'
  }

  return queryBuilder.facts(options)
}

async function listingsReport(user_id, brand_id) {
  const filter = [
    {
      key: 'deal_type',
      type: 'point',
      point: 'Selling',
      invert: false
    },
    {
      key: 'property_type',
      type: 'set',
      set: ['Residential Lease', 'Commercial Lease'],
      invert: true
    },
    {
      key: 'list_date',
      type: 'range',
      high: moment().unix(),
      low: moment()
        .add(-7, 'days')
        .startOf('day')
        .unix()
    }
  ]

  const queryBuilder = new DealsModel(null, filter, user_id, brand_id)
  const options = {
    fields: ['title', 'seller_agent', 'branch_title', 'list_price', 'sellers'],
    order: 'contract_date'
  }

  return queryBuilder.facts(options)
}

async function testOffersIncludedinContractsReport() {
  await createDeals()

  const facts = await contractsReport(sellerAgent.id, brand.id)
  expect(facts).to.have.length(2)

  const facts_for_another_user = await contractsReport(
    anotherAgent.id,
    anotherBrand.id
  )
  expect(facts_for_another_user).to.have.length(0)
}

async function testListingsReport() {
  await createListingWithOffer(sellerAgent, buyerAgent, brand, 10018693)

  const facts = await listingsReport(sellerAgent.id, brand.id)

  expect(facts).to.have.length(1)

  const facts_for_another_user = await contractsReport(
    anotherAgent.id,
    anotherBrand.id
  )
  expect(facts_for_another_user).to.have.length(0)
}

describe('Analytics', () => {
  describe('Deals', () => {
    createContext()
    beforeEach(setup)

    it(
      'should include listing offers in contracts report',
      testOffersIncludedinContractsReport
    )
    it('should calculate listings report correctly', testListingsReport)
  })
})
