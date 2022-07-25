const moment = require('moment')
const b64 = require('base64url')

const config = require('../config')

const am = require('../utils/async_middleware')
const expect = require('../utils/validator').expect

const Brand = require('../models/Brand')
const User = require('../models/User/get')

const Calendar = {
  ...require('../models/Calendar/filter'),
  ...require('../models/Calendar/filterParallel'),
}
const getAsICal = require('../models/Calendar/ical')
const CalendarWorker = require('../models/Calendar/worker/notification')
const MLSJob = require('../models/MLSJob')
const FeedSetting = require('../models/Calendar/feed_settings')
const NotificationSetting = require('../models/Calendar/notification')
const Crypto = require('../models/Crypto')

function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id)
    throw Error.BadRequest('Brand is not specified.')

  return brand.id
}

function brandAccess(req, res, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  return Brand.limitAccess({ user, brand }).nodeify(err => {
    if (err) {
      return res.error(err)
    }

    next()
  })
}

async function calendarView(req, res) {
  const users = req.query.users
  const brand_id = getCurrentBrand()

  let event_types = req.query.event_types || []
  let object_types = req.query.object_types || []

  const default_object_types = ['crm_task','deal_context','contact_attribute']
  const default_event_types = [
    '!Note'
  ]

  // low and high validation
  if (!req.query.high && !req.query.low || (!req.query.limit && (!req.query.high || !req.query.low)))
    throw Error.Validation('At least low or high and/or limit arguments are required.')

  const numeric_regex = /^-?[0-9.]+$/
  if (!numeric_regex.test(req.query.high) || !numeric_regex.test(req.query.low))
    throw Error.Validation('Low & high arguments should be numeric timestamps.')

  const high = parseInt(req.query.high)
  const low = parseInt(req.query.low)

  // event_types and object_types validation
  if (!Array.isArray(event_types))
    throw Error.BadRequest('Event_types is not Array!')

  if (!Array.isArray(object_types))
    throw Error.BadRequest('Object_types is not Array!')

  event_types = event_types.filter(elm => { return elm !== null && elm !== '' })
  object_types = object_types.filter(elm => { return elm !== null && elm !== '' })

  if (object_types.length === 0)
    object_types = default_object_types

  if (event_types.length === 0)
    event_types = default_event_types

  const result = await Calendar.filter([{
    brand: brand_id,
    users,
  }], { ...req.query, low, high, event_types, object_types, accessible_to: req.user.id })

  return res.collection(result, {
    low: new Date(low * 1000).toUTCString(),
    high: new Date(high * 1000).toUTCString()
  })
}

async function calendarViewParallel(req, res) {
  const users = req.query.users
  const brand_id = getCurrentBrand()

  let event_types = req.query.event_types || []
  let object_types = req.query.object_types || []

  const default_object_types = ['crm_task','deal_context','contact_attribute']
  const default_event_types = [
    '!Note'
  ]

  // low and high validation
  if (!req.query.high || !req.query.low)
    throw Error.Validation('Both low & high arguments are required.')

  const numeric_regex = /^-?[0-9.]+$/
  if (!numeric_regex.test(req.query.high) || !numeric_regex.test(req.query.low))
    throw Error.Validation('Low & high arguments should be numeric timestamps.')

  const high = parseInt(req.query.high)
  const low = parseInt(req.query.low)

  // event_types and object_types validation
  if (!Array.isArray(event_types))
    throw Error.BadRequest('Event_types is not Array!')

  if (!Array.isArray(object_types))
    throw Error.BadRequest('Object_types is not Array!')

  event_types = event_types.filter(elm => { return elm !== null && elm !== '' })
  object_types = object_types.filter(elm => { return elm !== null && elm !== '' })

  if (object_types.length === 0)
    object_types = default_object_types

  if (event_types.length === 0)
    event_types = default_event_types

  const result = await Calendar.filterParallel([{
    brand: brand_id,
    users,
  }], { ...req.query, low, high, event_types, object_types, accessible_to: req.user.id })

  return res.collection(result, {
    low: new Date(low * 1000).toUTCString(),
    high: new Date(high * 1000).toUTCString()
  })
}

async function calendarFeed(req, res) {
  const low = moment().add(-2, 'months').unix()
  const high = moment().add(10, 'months').unix()
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
  const feed = await getAsICal(filter, {
    low: low,
    high: high,
    event_types: types,
    object_types: ['crm_task','deal_context','contact_attribute']
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

  if (types) expect(types).to.be.an('array')

  if (!Array.isArray(filter) || filter.length < 1) {
    throw Error.Validation('Filter is not specified.')
  }

  for (const f of filter) {
    expect(f.brand).to.be.uuid
  }

  const data = {
    userId,
    types,
    filter
  }

  await FeedSetting.create(userId, data)
  let url = encryptDataAndMakeUrl({userId}, req.protocol, req.hostname)
  url = `${url}?timestamp=${moment().unix()}`
  res.model(url)
}

async function getCalendarFeedSetting(req, res) {
  const user_id = req.user.id
  const result = await FeedSetting.get(user_id)

  if (!result) {
    return res.model({})
  }

  let url = encryptDataAndMakeUrl({
    userId: user_id,
  }, req.protocol, req.hostname)
  url = `${url}?timestamp=${moment().unix()}`
  res.model({
    ...result,
    url
  })
}

async function getGlobalNotificationSettings(req, res) {
  const settings = await NotificationSetting.getGlobalSettings(req.user.id, getCurrentBrand())

  res.collection(settings)
}

async function setGlobalNotificationSettings(req, res) {
  await NotificationSetting.setGlobalSettings(req.body.settings, req.user.id, getCurrentBrand())

  res.status(204)
  res.end()
}

function encryptDataAndMakeUrl(data, protocol, hostname) {
  const encrypted = Crypto.encrypt(JSON.stringify(data))
  return `${protocol}://${hostname}/calendar/${b64(encrypted)}.iCal`
}

async function forceSendNotifications(req, res) {
  config.calendar.notification_hour = null
  await CalendarWorker.sendNotifications()

  MLSJob.insert(
    {
      name: 'calendar_notification'
    },
    () => {}
  )

  res.status(204)
  res.end()
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/calendar', auth, brandAccess, am(calendarView))
  app.get('/calendar/parallel', auth, brandAccess, am(calendarViewParallel))
  app.get('/calendar/:encrypted.iCal', am(calendarFeed))
  app.post('/calendar/feed', auth, am(getCalendarFeedUrl))
  app.get('/calendar/feed/setting', auth, am(getCalendarFeedSetting))

  app.get('/calendar/settings/notifications', brandAccess, am(getGlobalNotificationSettings))
  app.put('/calendar/settings/notifications', brandAccess, am(setGlobalNotificationSettings))
  app.post('/calendar/settings/notifications/force', brandAccess, am(forceSendNotifications))
}

module.exports = router
