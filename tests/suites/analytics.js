const _ = require('lodash')
const moment = require('moment')
const ical = require('ical')

let { contacts } = require('./data/calendar')
const { deal } = require('./data/calendar')

let defs

registerSuite('listing', ['getListing'])
registerSuite('brand', ['createParent', 'create'])
registerSuite('user', ['upgradeToAgentWithEmail'])

function prepareContactRequest(defs) {
  contacts = contacts.map(c => ({
    attributes: Object.keys(c).map(a => ({
      attribute_def: defs[a].id,
      [defs[a].data_type]: c[a]
    }))
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
}

function getCalendarFeedUrl(cb) {
  return frisby
    .create('get url for calendar feed')
    .get('/calendar/feed?types[]=birthday&types[]=option_period')
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

module.exports = {
  getAttributeDefs,
  createContacts,
  createDeal,
  getCalendar,
  getCalendarFeedUrl,
  getCalendarFeed,
  getCalendarFeedSetting
}