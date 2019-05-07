const _ = require('lodash')
const moment = require('moment')
const ical = require('ical')

let { contacts } = require('./data/calendar')
const { deal } = require('./data/calendar')

const calendarObj = require('./expected_objects/calendar.js')

let defs

registerSuite('listing', ['getListing'])
registerSuite('brand', ['createParent', 'create'])
registerSuite('user', ['upgradeToAgentWithEmail'])

function prepareContactRequest(defs) {
  contacts = contacts.map(c => ({
    user: results.authorize.token.data.id,
    attributes: Object.keys(c).map(k => {
      const is_partner = /^partner_/.test(k)
      const a = k.replace(/^partner_/, '')

      return {
        attribute_def: defs[a].id,
        [defs[a].data_type]: c[k],
        is_partner
      }
    })
  }))
}

function getAttributeDefs(cb) {
  return frisby
    .create('get all attribute defs, global or user-defined')
    .get('/contacts/attribute_defs')
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      defs = _.keyBy(json.data, 'name')

      prepareContactRequest(defs)

      cb(err, res, json)
    })
    .expectStatus(200)
}

const createDeal = (cb) => {
  deal.listing = results.listing.getListing.data.id

  return frisby.create('create a deal')
    .post('/deals', deal)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .addHeader('x-handle-jobs', 'yes')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        type: 'deal'
      }
    })
}

function createContacts(cb) {
  return frisby
    .create('create contacts')
    .post('/contacts?get=false&relax=true&activity=false', {
      contacts
    })
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .addHeader('x-handle-jobs', 'yes')
    .after(cb)
    .expectStatus(200)
}

function getCalendar(cb) {
  const low = moment().subtract(10, 'day').startOf('day').unix()
  const high = moment().add(20, 'day').startOf('day').unix()
  return frisby
    .create('get calendar events')
    .get(`/calendar?low=${low}&high=${high}`, {
      contacts
    })
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [calendarObj],
      info: {
        low: String,
        high: String,
        count: Number,
        total: Number
      }
    })
}

function getCalendarByObjectTypeFilter(cb) {
  const low = moment().subtract(10, 'day').startOf('day').unix()
  const high = moment().add(20, 'day').startOf('day').unix()
  
  const object_type_1 = 'crm_task'
  const object_type_2 = 'contact_attribute'
  const object_type_3 = 'deal_context'
  const object_type_4 = 'email_campaign'
  const object_type_5 = 'contact'

  const url = `/calendar?low=${low}`
                + `&high=${high}`
                + `&object_types[]=${object_type_1}`
                + `&object_types[]=${object_type_2}`
                + `&object_types[]=${object_type_3}`
                + `&object_types[]=${object_type_4}`
                + `&object_types[]=${object_type_5}`

  return frisby
    .create('get calendar events - filtered by object_type')
    .get(url, {
      contacts
    })
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [calendarObj],
      info: {
        low: String,
        high: String,
        count: Number,
        total: Number
      }
    })
}

function getCalendarFeedUrl(cb) {
  return frisby
    .create('get url for calendar feed')
    .post('/calendar/feed', {
      types: [
        'birthday',
        'wedding_anniversary',
        'option_period'
      ],
      filter: [{
        brand: results.brand.create.data.id
      }]
    })
    .after((err, res) => {
      if (err) {
        return cb(err)
      }
      results.analytics = results.analytics || {}
      results.analytics.getCalendarFeedUrl = res.body.data
      return cb(null, res)
    })
    .expectStatus(200)
}

function getCalendarFeed(cb) {
  const url = results.analytics.getCalendarFeedUrl.data.replace(/^.*calendar\//, '/calendar/')

  return frisby
    .create('get calendar feed')
    .get(url)
    .after((err, res, text) => {
      const events = ical.parseICS(text)

      for (const id in events) {
        const ev = events[id]
        if (ev.type === 'VEVENT' && ev.description === '5020  Junius Street') {
          if (ev.summary.indexOf('End Of Option') < 0) {
            throw 'Event summary does not include event type'
          }
        }
      }

      cb(err, res, text)
    })
    .expectStatus(200)
}

function getCalendarFeedSetting(cb) {
  return frisby
    .create('get calendar feed')
    .get('/calendar/feed/setting')
    .after(cb)
    .expectStatus(200)
}

function setCalendarNotificationSettings(cb) {
  return frisby
    .create('set calendar notification settings for birthday')
    .put('/calendar/settings/notifications', {
      settings: [{
        object_type: 'contact_attribute',
        event_type: 'birthday',
        reminder: 24 * 60 * 60
      }]
    })
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(cb)
    .expectStatus(204)
}

function getCalendarNotificationSettings(cb) {
  return frisby
    .create('get calendar notification settings')
    .get('/calendar/settings/notifications')
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      data: [{
        object_type: 'contact_attribute',
        event_type: 'birthday',
        reminder: 24 * 60 * 60
      }]
    })
}

module.exports = {
  getAttributeDefs,
  createContacts,
  createDeal,
  getCalendar,
  getCalendarByObjectTypeFilter,
  getCalendarFeedUrl,
  getCalendarFeed,
  getCalendarFeedSetting,
  setCalendarNotificationSettings,
  getCalendarNotificationSettings
}
