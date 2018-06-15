const am = require('../utils/async_middleware')
const Orm = require('../models/Orm')
const Calendar = require('../models/Analytics/Calendar')
const { Deals } = require('../models/Analytics/OLAP')
const { BadFilter, UndefinedDimension, UndefinedLevel } = require('../models/Analytics/OLAP/errors')
const Brand = require('../models/Brand')

const models = {
  deals: Deals
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
  const {drilldown, filter} = req.body

  if (!models.hasOwnProperty(cube_name))
    throw Error.ResourceNotFound('Model name not found.')

  const query = req.query

  for (const k of ['limit', 'start']) {
    if (query.hasOwnProperty(k))
      query[k] = parseFloat(query[k])
  }
  
  try {
    const queryBuilder = new models[cube_name](drilldown, filter, req.user.id)

    const rows = await queryBuilder.facts(query)
    const ids = rows.map(r => r.id)

    const entities = await Orm.getAll(orm_models[cube_name], ids)

    res.collection(entities)
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

  const numeric_regex = /^[0-9.]+$/
  if (!numeric_regex.test(req.query.high) || !numeric_regex.test(req.query.low)) {
    throw Error.Validation('Low & high arguments should be numeric timestamps.')
  }

  const high = parseInt(req.query.high)
  const low = parseInt(req.query.low)

  const result = await Calendar.getForUser(user_id, brand_id, low, high)

  return res.collection(result)
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/analytics/:cube/aggregate', auth, am(aggregate))
  app.post('/analytics/:cube/facts', auth, am(facts))
  app.get('/analytics/:cube/model', auth, getModel)

  app.get('/calendar', auth, am(calendarView))
}

module.exports = router