const moment = require('moment')
const am = require('../utils/async_middleware')
const Orm = require('../models/Orm')
const Calendar = require('../models/Analytics/Calendar')
const { Deals } = require('../models/Analytics/OLAP/cubes')
const { DealsQueryBuilder } = require('../models/Analytics/OLAP')
const { BadFilter, UndefinedDimension, UndefinedLevel } = require('../models/Analytics/OLAP/errors')
const Brand = require('../models/Brand')
const crypto = require('crypto')
const uad = require('../models/User/auxiliary-data')
const {writeCSVToStreamWithIndependentHeaders} = require('../utils/convert_to_excel')
const exportAsFeed = require('../models/Analytics/calendar-feed').exportAsFeed
const expect = require('../utils/validator').expect

const feed_key_prefix = 'feed_data_'

const models = {
  deals: DealsQueryBuilder(Deals)
}

const orm_models = {
  deals: 'Deal'
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
    const queryBuilder = new models[cube_name](drilldown, filter, req.user.id)

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
  const oneYearAgo = new Date(moment().subtract(1, 'year')).getTime()
  const oneYearFromNow = new Date(moment().add(1, 'year')).getTime()
  const info = await uad.findByKey(feed_key_prefix + req.params.id)
  const {userId, brandId, types} = info

  const result = await Calendar.getForUser(userId, brandId, oneYearAgo, oneYearFromNow, types)
  exportAsFeed(res, result)
}

async function getCalendarFeedUrl(req, res) {
  const userId = req.user.id
  const types = req.query.types
  const brandId = req.query.brand
  expect(types).to.be.an('array')
  const hash = crypto.createHash('sha256')
  const hashData = {
    userId,
    brandId,
    types
  }
  hash.update(JSON.stringify(hashData))
  const hashed = hash.digest('hex')
  await uad.save(userId, feed_key_prefix + hashed, hashData)
  const url = `${req.protocol}://${req.hostname}/calendar.iCal/${hashed}`
  res.model(url)
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/analytics/:cube/aggregate', auth, am(aggregate))
  app.post('/analytics/:cube/facts', auth, am(facts))
  app.get('/analytics/:cube/model', auth, getModel)

  app.get('/calendar', auth, am(calendarView))
  app.get('/calendar.iCal/:id', auth, am(calendarFeed))
  app.get('/calendar/feed', auth, am(getCalendarFeedUrl))
}

module.exports = router