const _ = require('lodash')
const moment = require('moment')

let { contacts } = require('./data/calendar')
let defs

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
    .after(function(err, res, json) {
      defs = _.keyBy(json.data, 'name')

      prepareContactRequest(defs)

      cb(err, res, json)
    })
    .expectStatus(200)
}

function createContacts(cb) {
  return frisby
    .create('create contacts')
    .post('/contacts?get=false&relax=true&activity=false', {
      contacts
    })
    .after(cb)
    .expectStatus(200)
}

function getCalendar(cb) {
  const low = moment().subtract(1, 'day').startOf('day').unix()
  const high = moment().add(2, 'day').startOf('day').unix()
  return frisby
    .create('get calendar events')
    .get(`/calendar?low=${low}&high=${high}`, {
      contacts
    })
    .after(cb)
    .expectStatus(200)
}

function getCalendarFeedUrl(cb) {
  return frisby
    .create('get url for calendar feed')
    .get('/calendar/feed?types[]=birthday')
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
    .after(cb)
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
  getCalendar,
  getCalendarFeedUrl,
  getCalendarFeed,
  getCalendarFeedSetting
}