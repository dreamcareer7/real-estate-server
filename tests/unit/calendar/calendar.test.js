const { expect } = require('chai')
const moment = require('moment-timezone')

const { createContext } = require('../helper')

const Calendar = require('../../../lib/models/Calendar')
const Context = require('../../../lib/models/Context')
const DealChecklist = require('../../../lib/models/Deal/checklist')
const { Listing } = require('../../../lib/models/Listing')
const User = require('../../../lib/models/User')

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

async function createDeal() {
  return DealHelper.create(user.id, brand.id, {
    checklists: [{
      is_draft: true,
      context: {
        closing_date: { value: moment().tz(user.timezone).add(10, 'day').startOf('day').format() },
        contract_date: { value: moment().tz(user.timezone).add(1, 'day').startOf('day').format() },
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
  })
}

async function testHidingDraftCriticalDates() {
  const deal = await createDeal()
  const cl = await DealChecklist.get(deal.checklists[0])
  let events

  events = await Calendar.filter([{
    brand: brand.id,
    users: [user.id]
  }], {
    high: moment().add(1, 'year').unix(),
    low: moment().add(-1, 'year').unix()
  })

  expect(events).to.be.empty

  await DealChecklist.update({
    ...cl,
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

describe('Calendar', () => {
  createContext()
  beforeEach(setup)

  it('should hide critical dates from draft checklists', testHidingDraftCriticalDates)
})
