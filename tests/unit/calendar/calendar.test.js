const { expect } = require('chai')
const moment = require('moment-timezone')

const { createContext } = require('../helper')

const Calendar = require('../../../lib/models/Calendar')
const Context = require('../../../lib/models/Context')
const { Listing } = require('../../../lib/models/Listing')
const Deal = require('../../../lib/models/Deal')
const User = require('../../../lib/models/User')
const CrmTask = require('../../../lib/models/CRM/Task')

const BrandHelper = require('../brand/helper')
const DealHelper = require('../deal/helper')

let user, brand, listing

async function setup(without_checklists = false) {
  user = await User.getByEmail('test@rechat.com')
  listing = await Listing.getByMLSNumber(10018693)

  const brand_data = {
    roles: {
      Admin: [user.id]
    }
  }

  if (without_checklists) {
    brand_data.contexts = []
    brand_data.checklists = []
  }

  brand = await BrandHelper.create(brand_data)
  Context.set({ user, brand })
}

async function createDeal(is_draft = true) {
  return DealHelper.create(user.id, brand.id, {
    checklists: [{
      context: {
        closing_date: { value: moment.utc().add(10, 'day').startOf('day').format() },
        contract_date: { value: moment.utc().add(1, 'day').startOf('day').format() },
      },
    }],
    roles: [{
      role: 'BuyerAgent',
      email: user.email,
      phone_number: user.phone_number,
      legal_first_name: user.first_name,
      legal_last_name: user.last_name
    }],
    listing: listing.id,
    is_draft
  })
}

async function testHidingDraftCriticalDates() {
  const deal = await createDeal()
  let events

  events = await Calendar.filter([{
    brand: brand.id,
    users: [user.id]
  }], {
    high: moment().add(1, 'year').unix(),
    low: moment().add(-1, 'year').unix()
  })

  expect(events).to.be.empty

  await Deal.update({
    ...deal,
    is_draft: false
  })

  events = await Calendar.filter([{
    brand: brand.id,
    users: [user.id]
  }], {
    high: moment().add(1, 'year').unix(),
    low: moment().add(-1, 'year').unix()
  })

  expect(events).to.have.length(2)
}

async function testHidingDroppedDeals() {
  async function createDealWithStatus(status, expected_events) {
    const deal = await DealHelper.create(user.id, brand.id, {
      deal_type: 'Selling',
      checklists: [{
        context: {
          expiration_date: { value: moment.utc().add(10, 'day').startOf('day').format() },
          list_date: { value: moment.utc().add(-1, 'day').startOf('day').format() },
          listing_status: { value: status }
        },
      }],
      roles: [{
        role: 'SellerAgent',
        email: user.email,
        phone_number: user.phone_number,
        legal_first_name: user.first_name,
        legal_last_name: user.last_name
      }],
      listing: listing.id,
      is_draft: false
    })

    const events = await Calendar.filter([{
      brand: brand.id,
      users: [user.id]
    }], {
      high: moment().add(1, 'year').unix(),
      low: moment().add(-1, 'year').unix()
    })

    expect(events).to.have.length(expected_events)

    await Deal.delete(deal.id)
    return deal
  }

  await createDealWithStatus('Withdrawn', 0)
  await createDealWithStatus('Cancelled', 0)
  await createDealWithStatus('Contract Terminated', 0)

  await createDealWithStatus('Sold', 1)
  await createDealWithStatus('Leased', 1)
  
  await createDealWithStatus('Active', 2)
}

async function testCorrectTimezone() {
  await createDeal(false)
  await CrmTask.create({
    brand: brand.id,
    created_by: user.id,
    assignees: [user.id],
    title: 'Test task',
    due_date: moment().unix(),
    status: 'DONE',
    task_type: 'Email'
  })

  const high = moment().add(1, 'year').unix(),
    low = moment().add(-1, 'year').unix()

  await Calendar.getAsICal({}, {
    low,
    high
  }, user.timezone)
}

describe('Calendar', () => {
  createContext()
  beforeEach(setup)

  it('should hide critical dates from draft checklists', testHidingDraftCriticalDates)
  it('should hide critical dates from dropped deals', testHidingDroppedDeals)
  it('should put events in correct timezones', testCorrectTimezone)
})
