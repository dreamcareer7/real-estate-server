const moment = require('moment')
const b64 = require('base64url')

const am = require('../utils/async_middleware')
const expect = require('../utils/validator').expect

const Brand = require('../models/Brand')
const User = require('../models/User')

const Calendar = require('../models/Calendar')
const FeedSetting = require('../models/Calendar/settings')

function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id)
    throw Error.BadRequest('Brand is not specified.')

  return brand.id
}

function brandAccess(req, res, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  return Brand.limitAccess({ user, brand }).then(next, err => res.error(err))
}

async function calendarView(req, res) {
  const users = req.query.users
  const brand_id = getCurrentBrand()

  if (!req.query.high || !req.query.low) {
    throw Error.Validation('Both low & high arguments are required.')
  }

  const numeric_regex = /^-?[0-9.]+$/
  if (!numeric_regex.test(req.query.high) || !numeric_regex.test(req.query.low)) {
    throw Error.Validation('Low & high arguments should be numeric timestamps.')
  }

  const high = parseInt(req.query.high)
  const low = parseInt(req.query.low)

  const result = await Calendar.filter([{
    brand: brand_id,
    users
  }], {low, high})

  return res.collection(result, {
    low: new Date(low * 1000).toUTCString(),
    high: new Date(high * 1000).toUTCString()
  })
}

async function calendarFeed(req, res) {
  const oneYearAgo = moment().subtract(1, 'year').unix()
  const oneYearFromNow = moment().add(1, 'year').unix()
  const encrypted = req.params['encrypted']

  let decrypted = Crypto.decrypt(b64.decode(encrypted))

  try {
    decrypted = JSON.parse(decrypted)
  }
  catch(err) {
    throw Error.Validation('Data is malformed')
  }
  const user_id = decrypted.userId

  const data = await FeedSetting.get(user_id)
  if (!data) {
    return res.end()
  }

  /** @type {ICalendarFilter[]?} */
  const filter = data.filter
  let types = data.selected_types

  if (Array.isArray(types) && types.length === 0) {
    types = null
  }

  const user = await User.get(user_id)
  const feed = await Calendar.getAsICal(filter, {
    low: oneYearAgo,
    high: oneYearFromNow,
    event_types: types
  }, user.timezone)

  res.writeHead(200, {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': 'attachment; filename="calendar.ics"'
  })

  res.end(feed)
}

async function getCalendarFeedUrl(req, res) {
  const userId = req.user.id
  const { types, filter } = req.body

  expect(types).to.be.an('array')
  const data = {
    userId,
    types,
    filter
  }
  await FeedSetting.create(userId, data)
  const url = encryptDataAndMakeUrl({userId}, req.protocol, req.hostname)
  res.model(url)
}

async function getCalendarFeedSetting(req, res) {
  const user_id = req.user.id
  const result = await FeedSetting.get(user_id)

  if (!result) {
    return res.model({})
  }

  const url = encryptDataAndMakeUrl({
    user_id,
  }, req.protocol, req.hostname)

  res.model({
    ...result,
    url
  })
}

function encryptDataAndMakeUrl(data, protocol, hostname) {
  const encrypted = Crypto.encrypt(JSON.stringify(data))
  return `${protocol}://${hostname}/calendar/${b64(encrypted)}.iCal`
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/calendar', auth, brandAccess, am(calendarView))
  app.get('/calendar/:encrypted.iCal', am(calendarFeed))
  app.post('/calendar/feed', auth, am(getCalendarFeedUrl))
  app.get('/calendar/feed/setting', auth, am(getCalendarFeedSetting))
}

module.exports = router
