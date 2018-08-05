const moment = require('moment')
const am = require('../utils/async_middleware')
const Calendar = require('../models/Analytics/Calendar')
const { Deals } = require('../models/Analytics/OLAP/cubes')
const { DealsQueryBuilder } = require('../models/Analytics/OLAP')
const { BadFilter, UndefinedDimension, UndefinedLevel } = require('../models/Analytics/OLAP/errors')
const Brand = require('../models/Brand')
const {writeCSVToStreamWithIndependentHeaders} = require('../utils/convert_to_excel')
const exportAsFeed = require('../models/Analytics/calendar-feed').exportAsFeed
const expect = require('../utils/validator').expect
const b64 = require('base64url')
const FeedSetting = require('../models/Analytics/FeedSetting')

function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id)
    throw Error.BadRequest('Brand is not specified.')
  
  return brand.id
}

const models = {
  deals: DealsQueryBuilder(Deals)
}

async function aggregate(req, res) {
  /** @type {'deals'} */
  const cube_name = req.params.cube
  const {drilldown, filter} = req.body

  if (!models.hasOwnProperty(cube_name))
    throw Error.ResourceNotFound('Model name not found.')

  try {
    const queryBuilder = new models[cube_name](drilldown, filter, req.user.id)

    const rows = await queryBuilder.aggregate()

    res.json({
      code: 'OK',
      data: rows
    })
  }
  catch (ex) {
    if (
      (ex instanceof BadFilter) ||
      (ex instanceof UndefinedDimension) ||
      (ex instanceof UndefinedLevel)
    ) {
      throw Error.BadRequest(ex)
    }
    throw ex
  }
}

async function facts(req, res) {
  /** @type {'deals'} */
  const cube_name = req.params.cube
  const {drilldown, filter, project} = req.body

  if (!models.hasOwnProperty(cube_name))
    throw Error.ResourceNotFound('Model name not found.')

  const {format, ...query} = req.query

  for (const k of ['limit', 'start']) {
    if (query.hasOwnProperty(k))
      query[k] = parseFloat(query[k])
  }

  try {
    const queryBuilder = new models[cube_name](drilldown, filter, req.user.id, getCurrentBrand())

    let fields, headers
    if (Array.isArray(project)) {
      fields = project
    }
    else if (typeof project === 'object') {
      fields = Object.keys(project)
      headers = Object.values(project)
    }

    const rows = await queryBuilder.facts({
      ...query,
      fields
    })

    switch (format) {
      case 'csv':
        const fileName = `Rechat-Report-${moment().format('MM-DD-YY-HH-mm')}.csv`
        res.attachment(fileName)
        writeCSVToStreamWithIndependentHeaders(
          rows,
          headers,
          res
        )
        break
      default:
        res.collection(rows)
        break
    }
  }
  catch (ex) {
    if (
      (ex instanceof BadFilter) ||
      (ex instanceof UndefinedDimension) ||
      (ex instanceof UndefinedLevel)
    ) {
      throw Error.BadRequest(ex)
    }
    throw ex
  }
}

function getModel(req, res) {
  /** @type {'deals'} */
  const cube_name = req.params.cube

  if (!models.hasOwnProperty(cube_name))
    throw Error.ResourceNotFound('Model name not found.')

  const cube = new models[cube_name]().cube

  res.json({
    code: 'OK',
    data: cube.model
  })
}

async function calendarView(req, res) {
  const user_id = req.user.id
  const brand = Brand.getCurrent()
  const brand_id = brand ? brand.id : null

  if (!req.query.high || !req.query.low) {
    throw Error.Validation('Both low & high arguments are required.')
  }

  const numeric_regex = /^-?[0-9.]+$/
  if (!numeric_regex.test(req.query.high) || !numeric_regex.test(req.query.low)) {
    throw Error.Validation('Low & high arguments should be numeric timestamps.')
  }

  const high = parseInt(req.query.high)
  const low = parseInt(req.query.low)

  const result = await Calendar.getForUser(user_id, brand_id, low, high)

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
  const {userId, brandId, types} = decrypted

  const result = await Calendar.getForUser(userId, brandId, oneYearAgo, oneYearFromNow, types)
  exportAsFeed(res, result)
}

async function getCalendarFeedUrl(req, res) {
  const userId = req.user.id
  const types = req.query.types || []
  const brandId = req.query.brandId
  expect(types).to.be.an('array')
  const data = {
    userId,
    brandId,
    types
  }
  await FeedSetting.create(userId, data)
  const encrypted = Crypto.encrypt(JSON.stringify(data))
  const url = `${req.protocol}://${req.hostname}/calendar/${b64(encrypted)}.iCal`
  res.model(url)
}

async function getCalendarFeedSetting(req, res) {
  const userId = req.user.id
  const result = await FeedSetting.get(userId)
  res.model(result)
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/analytics/:cube/aggregate', auth, am(aggregate))
  app.post('/analytics/:cube/facts', auth, am(facts))
  app.get('/analytics/:cube/model', auth, getModel)

  app.get('/calendar', auth, am(calendarView))
  app.get('/calendar/:encrypted.iCal', am(calendarFeed))
  app.get('/calendar/feed', auth, am(getCalendarFeedUrl))
  app.get('/calendar/feed/setting', auth, am(getCalendarFeedSetting))
}

module.exports = router