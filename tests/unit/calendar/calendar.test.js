const { expect } = require('chai')
const ical = require('ical')
const { Mock } = require('./data/mock')

const moment = require('moment-timezone')

const { createContext, handleJobs } = require('../helper')
const Calendar = require('../../../lib/models/Calendar')
const getAsICal = require('../../../lib/models/Calendar/ical')
const Agent = require('../../../lib/models/Agent')
const Contact = require('../../../lib/models/Contact/manipulate')
const Context = require('../../../lib/models/Context')
const EmailCampaign = require('../../../lib/models/Email/campaign')
const { Listing } = require('../../../lib/models/Listing')
const Deal = require('../../../lib/models/Deal')
const Orm = require('../../../lib/models/Orm/index')
const User = require('../../../lib/models/User/get')
const CrmTask = require('../../../lib/models/CRM/Task')

const sql = require('../../../lib/utils/sql')

const BrandHelper = require('../brand/helper')
const DealHelper = require('../deal/helper')
const { attributes } = require('../contact/helper')

const agents = require('./data/agents.json')

let user, brand, listing

async function setup(without_checklists = false) {
  user = await User.getByEmail('test@rechat.com')
  const listings = await Listing.getByMLSNumber(10018693)
  listing = listings[0]

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

async function fetchEvents(low = moment().add(-1, 'year').unix(), high = moment().add(1, 'year').unix()) {
  return Calendar.filter([{
    brand: brand.id,
    users: [user.id]
  }], {
    high,
    low
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

  events = await fetchEvents()

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

    const events = await fetchEvents()

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

async function testDealClosingDateHomeAnniversary() {
  await DealHelper.create(user.id, brand.id, {
    deal_type: 'Buying',
    checklists: [{
      context: {
        contract_date: { value: moment.utc().add(-10, 'day').startOf('day').format() },
        closing_date: { value: moment.utc().add(-5, 'day').startOf('day').format() },
      },
    }],
    roles: [{
      role: 'BuyerAgent',
      email: user.email,
      phone_number: user.phone_number,
      legal_first_name: user.first_name,
      legal_last_name: user.last_name
    }, {
      role: 'Buyer',
      email: 'john@doe.com',
      phone_number: '(281) 531-6582',
      legal_first_name: 'John',
      legal_last_name: 'Doe'
    }],
    listing: listing.id,
    is_draft: false
  })

  await Contact.create([{
    user: user.id,
    attributes: attributes({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@doe.com',
    }),
  }], user.id, brand.id)

  await handleJobs()
  await sql.update('REFRESH MATERIALIZED VIEW CONCURRENTLY deals_brands')
  await sql.update('REFRESH MATERIALIZED VIEW calendar.deals_buyers')
  await sql.update('REFRESH MATERIALIZED VIEW calendar.deals_closed_buyers')

  const events = await fetchEvents()
  expect(events).to.have.length(3)
  expect(events.map(e => e.event_type)).to.have.members([ 'contract_date', 'closing_date', 'home_anniversary' ])
}

async function testDealLeaseEndHomeAnniversary() {
  await DealHelper.create(user.id, brand.id, {
    deal_type: 'Buying',
    checklists: [{
      context: {
        lease_begin: { value: moment.utc().add(-10, 'day').startOf('day').format() },
        lease_end: { value: moment.utc().add(-10, 'day').add(1, 'year').startOf('day').format() },
      },
    }],
    roles: [{
      role: 'BuyerAgent',
      email: user.email,
      phone_number: user.phone_number,
      legal_first_name: user.first_name,
      legal_last_name: user.last_name
    }, {
      role: 'Buyer',
      email: 'john@doe.com',
      phone_number: '(281) 531-6582',
      legal_first_name: 'John',
      legal_last_name: 'Doe'
    }],
    listing: listing.id,
    is_draft: false
  })

  await Contact.create([{
    user: user.id,
    attributes: attributes({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@doe.com',
    }),
  }], user.id, brand.id)

  await handleJobs()
  await sql.update('REFRESH MATERIALIZED VIEW CONCURRENTLY deals_brands')
  await sql.update('REFRESH MATERIALIZED VIEW calendar.deals_buyers')
  await sql.update('REFRESH MATERIALIZED VIEW calendar.deals_closed_buyers')

  const events = await fetchEvents()
  expect(events.map(e => e.event_type)).to.have.members([ 'lease_begin', 'lease_end', 'home_anniversary' ])
  expect(events).to.have.length(3)
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

  await getAsICal([{ brand: brand.id, users: [user.id] }], {
    low,
    high
  }, user.timezone)
}

async function testDealExportEvents() {
  const high = moment().add(1, 'year').unix()
  const low = moment().add(-1, 'year').unix()
  const now = moment().utc()
  const fiveDaysAgo = now.clone().add(-5, 'day')
  const tenDaysAgo = now.clone().add(-10, 'day')
  await DealHelper.create(user.id, brand.id, {
    deal_type: 'Buying',
    checklists: [{
      context: {
        contract_date: { value: fiveDaysAgo.format() },
        closing_date: { value: tenDaysAgo.format() },
      },
    }],
    roles: [{
      role: 'BuyerAgent',
      email: user.email,
      phone_number: user.phone_number,
      legal_first_name: user.first_name,
      legal_last_name: user.last_name
    }, {
      role: 'Buyer',
      email: 'john@doe.com',
      phone_number: '(281) 531-6582',
      legal_first_name: 'John',
      legal_last_name: 'Doe'
    }],
    listing: listing.id,
    is_draft: false
  })

  await Contact.create([{
    user: user.id,
    attributes: attributes({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@doe.com',
    }),
  }], user.id, brand.id)

  await handleJobs()
  await sql.update('REFRESH MATERIALIZED VIEW CONCURRENTLY deals_brands')
  await sql.update('REFRESH MATERIALIZED VIEW calendar.deals_buyers')
  await sql.update('REFRESH MATERIALIZED VIEW calendar.deals_closed_buyers')

  const feeds = await getAsICal([{ brand: brand.id, users: [user.id] }], {
    low,
    high
  }, 'America/Chicago')

  const distrustFeed = ical.parseICS(feeds)
  const feedValues = Object.values(distrustFeed)

  const dateFormat = (dateInString) => moment(dateInString).format('YYYY/MM/DD') // skip the time
  const eventFormat = (dateInString) => moment(dateInString).tz('America/Chicago').format('YYYY/MM/DD hh:mm') // skip secondes and milliseconds 

  expect(eventFormat(feedValues[1]['dtstamp'])).to.be.equal(eventFormat(now))
  expect(dateFormat(feedValues[1]['start'])).to.be.equal(dateFormat(tenDaysAgo))
  expect(dateFormat(feedValues[1]['end'])).to.be.equal(dateFormat(tenDaysAgo))

  expect(eventFormat(feedValues[2]['dtstamp'])).to.be.equal(eventFormat(now))
  expect(dateFormat(feedValues[2]['start'])).to.be.equal(dateFormat(tenDaysAgo))
  expect(dateFormat(feedValues[2]['end'])).to.be.equal(dateFormat(tenDaysAgo))

  expect(eventFormat(feedValues[3]['dtstamp'])).to.be.equal(eventFormat(now))
  expect(dateFormat(feedValues[3]['start'])).to.be.equal(dateFormat(fiveDaysAgo))
  expect(dateFormat(feedValues[3]['end'])).to.be.equal(dateFormat(fiveDaysAgo))
}

async function testExportForEventsOnNullEndDate() {
  const high = moment().add(1, 'year').unix()
  const low = moment().add(-1, 'year').unix()

  const now = moment().utc()
  const next30Mins = now.clone().add(30 ,'minutes')
  const next120Mins = now.clone().add(120 ,'minutes')
  const next150Mins = now.clone().add(150 ,'minutes')

  await CrmTask.create(Mock.getCrmTaskEvent({ brand: brand.id, created_by: user.id, assignees: [user.id], due_date: now.unix(), end_date: null, all_day: false, task_type: 'crm_task' }))
  await CrmTask.create(Mock.getCrmTaskEvent({ brand: brand.id, created_by: user.id, assignees: [user.id], due_date: next30Mins.unix(), end_date: null, all_day: false, task_type: 'crm_task' }))

  const feeds = await getAsICal([{ brand: brand.id, users: [user.id] }], {
    low,
    high
  }, 'America/Chicago')

  const distrustFeed = ical.parseICS(feeds)
  const feedValues = Object.values(distrustFeed)

  const eventFormat = (dateInString) => moment(dateInString).tz('America/Chicago').format('YYYY/MM/DD hh:mm') // skip secondes and milliseconds 

  expect(eventFormat(feedValues[1]['dtstamp'])).to.be.equal(eventFormat(now))
  expect(eventFormat(feedValues[1]['start'])).to.be.equal(eventFormat(now))
  expect(eventFormat(feedValues[1]['end'])).to.be.equal(eventFormat(next120Mins))

  expect(eventFormat(feedValues[2]['dtstamp'])).to.be.equal(eventFormat(now))
  expect(eventFormat(feedValues[2]['start'])).to.be.equal(eventFormat(next30Mins))
  expect(eventFormat(feedValues[2]['end'])).to.be.equal(eventFormat(next150Mins))
}

async function testExportForEvents() {
  const high = moment().add(1, 'year').unix()
  const low = moment().add(-1, 'year').unix()

  const now = moment().utc()
  const next30Mins = now.clone().add(30 ,'minutes')
  const next60Mins = now.clone().add(60 ,'minutes')

  
  await CrmTask.create(Mock.getCrmTaskEvent({ brand: brand.id, created_by: user.id, assignees: [user.id], due_date: now.unix(), all_day: true }))
  await CrmTask.create(Mock.getCrmTaskEvent({ brand: brand.id, created_by: user.id, assignees: [user.id], due_date: now.unix(), all_day: true }))
  await CrmTask.create(Mock.getCrmTaskEvent({ brand: brand.id, created_by: user.id, assignees: [user.id], due_date: now.unix(), end_date: next30Mins.unix(), all_day: false, task_type: 'crm_task' }))
  await CrmTask.create(Mock.getCrmTaskEvent({ brand: brand.id, created_by: user.id, assignees: [user.id], due_date: next30Mins.unix(), end_date: next60Mins.unix(), all_day: false, task_type: 'crm_task' }))

  const feeds = await getAsICal([{ brand: brand.id, users: [user.id] }], {
    low,
    high
  }, 'America/Chicago')

  const distrustFeed = ical.parseICS(feeds)
  const feedValues = Object.values(distrustFeed)

  const dateFormat = (dateInString) => moment(dateInString).format('YYYY/MM/DD') // skip the time
  const eventFormat = (dateInString) => moment(dateInString).tz('America/Chicago').format('YYYY/MM/DD hh:mm') // skip secondes and milliseconds 

  expect(eventFormat(feedValues[1]['dtstamp'])).to.be.equal(eventFormat(now))
  expect(dateFormat(feedValues[1]['start'])).to.be.equal(dateFormat(now))
  expect(dateFormat(feedValues[1]['end'])).to.be.equal(dateFormat(now))

  expect(eventFormat(feedValues[2]['dtstamp'])).to.be.equal(eventFormat(now))
  expect(dateFormat(feedValues[2]['start'])).to.be.equal(dateFormat(now))
  expect(dateFormat(feedValues[2]['end'])).to.be.equal(dateFormat(now))

  expect(eventFormat(feedValues[3]['dtstamp'])).to.be.equal(eventFormat(now))
  expect(eventFormat(feedValues[3]['start'])).to.be.equal(eventFormat(now))
  expect(eventFormat(feedValues[3]['end'])).to.be.equal(eventFormat(next30Mins))

  expect(eventFormat(feedValues[4]['dtstamp'])).to.be.equal(eventFormat(now))
  expect(eventFormat(feedValues[4]['start'])).to.be.equal(eventFormat(next30Mins))
  expect(eventFormat(feedValues[4]['end'])).to.be.equal(eventFormat(next60Mins))
}

async function testExportForDealsEvents() {
  const high = moment().add(1, 'year').unix()
  const low = moment().add(-1, 'year').unix()

  const now = moment()
  const nextDay = now.clone().add(1 ,'days')
  const previousDay = now.clone().subtract(1 ,'days')


  await CrmTask.create(Mock.getCrmTaskEvent({ brand: brand.id, created_by: user.id, assignees: [user.id], due_date: previousDay.unix(), all_day: true }))
  await CrmTask.create(Mock.getCrmTaskEvent({ brand: brand.id, created_by: user.id, assignees: [user.id], due_date: now.unix(), all_day: true }))
  await CrmTask.create(Mock.getCrmTaskEvent({ brand: brand.id, created_by: user.id, assignees: [user.id], due_date: nextDay.unix(), all_day: true }))
  
  const feeds = await getAsICal([{ brand: brand.id, users: [user.id] }], {
    low,
    high
  }, 'America/Chicago')

  const distrustFeed = ical.parseICS(feeds)
  const feedValues = Object.values(distrustFeed)

  const dateFormat = (dateInString) => moment(dateInString).format('YYYY/MM/DD') // skip the time

  const eventFormat = (dateInString) => moment(dateInString).tz('America/Chicago').format('YYYY/MM/DD hh:mm') // skip secondes and milliseconds 

  expect(eventFormat(feedValues[1]['dtstamp'])).to.be.equal(eventFormat(now))
  expect(dateFormat(feedValues[1]['start'])).to.be.equal(dateFormat(previousDay))
  expect(dateFormat(feedValues[1]['end'])).to.be.equal(dateFormat(previousDay))

  expect(eventFormat(feedValues[2]['dtstamp'])).to.be.equal(eventFormat(now))
  expect(dateFormat(feedValues[2]['start'])).to.be.equal(dateFormat(now))
  expect(dateFormat(feedValues[2]['end'])).to.be.equal(dateFormat(now))

  expect(eventFormat(feedValues[3]['dtstamp'])).to.be.equal(eventFormat(now))
  expect(dateFormat(feedValues[3]['start'])).to.be.equal(dateFormat(nextDay))
  expect(dateFormat(feedValues[3]['end'])).to.be.equal(dateFormat(nextDay))


}

function testContactEvent(event_type, type_label) {
  return async () => {
    await Contact.create([{
      user: user.id,
      attributes: attributes({
        first_name: 'John',
        last_name: 'Doe',
        [event_type]: moment.utc().startOf('day').add(10, 'days').add(12, 'hours').year(1800).unix()
      }),
    }], user.id, brand.id)
  
    await handleJobs()
  
    const events = await fetchEvents()
  
    expect(events).to.have.length(1)
    expect(events[0].title).to.be.equal(`John Doe's ${type_label}`)
  }
}

async function testSpouseBirthday() {
  await Contact.create([{
    user: user.id,
    attributes: attributes({
      first_name: 'John',
      last_name: 'Doe',
      spouse_first_name: 'Jane',
      spouse_birthday: moment().add(10, 'days').year(1800).unix()
    }),
  }], user.id, brand.id)

  await handleJobs()

  const events = await fetchEvents()

  expect(events).to.have.length(1)
  expect(events[0].title).to.be.equal('John Doe\'s Spouse\'s Birthday (Jane)')
}

async function testSpouseBirthdayWithEmptySpouseName() {
  await Contact.create([{
    user: user.id,
    attributes: attributes({
      first_name: 'John',
      last_name: 'Doe',
      spouse_birthday: moment().add(10, 'days').year(1800).unix()
    }),
  }], user.id, brand.id)

  await handleJobs()

  const events = await fetchEvents()

  expect(events).to.have.length(1)
  expect(events[0].title).to.be.equal('John Doe\'s Spouse\'s Birthday')
}

async function testChildBirthday() {
  await Contact.create([{
    user: user.id,
    attributes: attributes({
      first_name: 'John',
      last_name: 'Doe',
      child_birthday: {
        label: 'Matthew',
        date: moment().add(10, 'days').year(1800).unix()
      }
    }),
  }], user.id, brand.id)

  await handleJobs()

  const events = await fetchEvents()

  expect(events).to.have.length(1)
  expect(events[0].title).to.be.equal('John Doe\'s Child\'s Birthday (Matthew)')
}

async function testNamelessChildBirthday() {
  await Contact.create([{
    user: user.id,
    attributes: attributes({
      first_name: 'John',
      last_name: 'Doe',
      child_birthday: {
        label: '',
        date: moment().add(10, 'days').year(1800).unix()
      }
    }),
  }], user.id, brand.id)

  await handleJobs()

  const events = await fetchEvents()

  expect(events).to.have.length(1)
  expect(events[0].title).to.be.equal('John Doe\'s Child\'s Birthday')
}

async function testChildBirthdayWithEmptyChildName() {
  await Contact.create([{
    user: user.id,
    attributes: attributes({
      first_name: 'John',
      last_name: 'Doe',
      child_birthday: moment().add(10, 'days').year(1800).unix()
    }),
  }], user.id, brand.id)

  await handleJobs()

  const events = await fetchEvents()

  expect(events).to.have.length(1)
  expect(events[0].title).to.be.equal('John Doe\'s Child\'s Birthday')
}

async function testCampaignToAgents() {
  const agent1 = await Agent.create(agents[0])
  const agent2 = await Agent.create(agents[1])

  const [id] = await EmailCampaign.createMany([{
    subject: 'Test subject',
    to: [{
      recipient_type: 'Agent',
      agent: agent1
    }, {
      recipient_type: 'Agent',
      agent: agent2
    }],
    created_by: user.id,
    from: user.id,
    brand: brand.id,
    due_at: new Date().toISOString(),
    html: '<html></html>',
    headers: {},
    attachments: []
  }])

  const events = await fetchEvents()

  expect(events).to.have.length(1)
  expect(events[0].id).to.equal(id)
  expect(events[0].people).to.have.length(2)
  expect(events[0].people.map(p => p.type)).to.have.members(['agent', 'agent'])
  expect(events[0].people.map(p => p.id)).to.have.members([agent1, agent2])

  const populated = await Orm.populate({ models: events, associations: ['calendar_event.people'] })
  expect(populated).to.have.length(1)
  expect(populated[0].id).to.equal(id)
  expect(populated[0].people).to.have.length(2)
  expect(populated[0].people.map(p => p.type)).to.have.members(['agent', 'agent'])
  expect(populated[0].people.map(p => p.id)).to.have.members([agent1, agent2])
}

// eslint-disable-next-line no-unused-vars
async function testCampaignToContacts() {
  const [contact_id] = await Contact.create([{
    user: user.id,
    attributes: attributes({
      first_name: 'John',
      last_name: 'Doe',
      email: ['john@doe.com']
    })
  }], user.id, brand.id)

  const [id] = await EmailCampaign.createMany([{
    subject: 'Test subject',
    to: [{
      recipient_type: 'Email',
      contact: contact_id,
      email: 'john@doe.com'
    }],
    created_by: user.id,
    from: user.id,
    brand: brand.id,
    due_at: new Date().toISOString(),
    html: '<html></html>',
    headers: {},
    attachments: []
  }])

  async function testFor(object_type) {
    const events = await Calendar.filter([{
      brand: brand.id,
      users: [user.id]
    }], {
      low: moment().add(-1, 'month').unix(),
      high: moment().add(1, 'month').unix(),
      object_types: [object_type]
    })

    expect(events).to.have.length(1)
    expect(events[0].id).to.equal(id)
    expect(events[0].people).to.have.length(1)
    expect(events[0].people.map(p => p.type)).to.have.members(['contact'])
    expect(events[0].people.map(p => p.id)).to.have.members([contact_id])

    const populated = await Orm.populate({ models: events, associations: ['calendar_event.people'] })
    expect(populated).to.have.length(1)
    expect(populated[0].id).to.equal(id)
    expect(populated[0].people).to.have.length(1)
    expect(populated[0].people.map(p => p.type)).to.have.members(['contact'])
    expect(populated[0].people.map(p => p.id)).to.have.members([contact_id])

    return { events, populated }
  }

  await testFor('email_campaign')

  const { events } = await testFor('email_campaign_recipient')
  expect(events[0].contact).to.equal(contact_id)
}

describe('Calendar', () => {
  createContext()

  describe('Deals', () => {
    beforeEach(setup)
    it('should hide critical dates from draft checklists', testHidingDraftCriticalDates)
    it('should hide critical dates from dropped deals', testHidingDroppedDeals)
    it('should return home anniversary from closing dates', testDealClosingDateHomeAnniversary)
    it('should return home anniversary from lease ends', testDealLeaseEndHomeAnniversary)
    it('should export deals events correctly for deals events', testDealExportEvents)
  })

  describe('Events', () => {
    beforeEach(setup)
    it('should put events in correct timezones', testCorrectTimezone)
    it.skip('should export events correctly for allday and none allday events', testExportForEvents)
    it('should export events correctly for deals events', testExportForDealsEvents)
    it('should export events correctly for on null endDate events', testExportForEventsOnNullEndDate)
  })

  describe('Contacts', () => {
    beforeEach(async () => setup(true))
    it('should give correct copy for birthday event', testContactEvent('birthday', 'Birthday'))
    it('should give correct copy for home anniversary event', testContactEvent('home_anniversary', 'Home Anniversary'))
    it('should give correct copy for work anniversary event', testContactEvent('work_anniversary', 'Work Anniversary'))
    it('should give correct copy for wedding anniversary event', testContactEvent('wedding_anniversary', 'Wedding Anniversary'))
    it('should put spouse name in spouse birthday event title', testSpouseBirthday)
    it('should put spouse name in spouse birthday event title when spouse name is empty', testSpouseBirthdayWithEmptySpouseName)
    it('should put child name in child birthday event title', testChildBirthday)
    it('should handle nameless child birthday in event title', testNamelessChildBirthday)
    it('should put child name in child birthday event title when child name is empty', testChildBirthdayWithEmptyChildName)
  })

  describe('Campaigns', () => {
    beforeEach(async () => setup(true))
    it('should give correct people for agent recipients', testCampaignToAgents)
    // it('should give correct people for contact recipients', testCampaignToContacts)
  })
})
