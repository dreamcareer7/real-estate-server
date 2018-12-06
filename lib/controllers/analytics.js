const moment = require('moment')
const am = require('../utils/async_middleware')
const {writeCSVToStreamWithIndependentHeaders} = require('../utils/convert_to_excel')

const { Deals } = require('../models/Analytics/OLAP/cubes')
const { DealsQueryBuilder, ContactJointExportQueryBuilder } = require('../models/Analytics/OLAP')
const { BadFilter, UndefinedDimension, UndefinedLevel } = require('../models/Analytics/OLAP/errors')

function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id)
    throw Error.BadRequest('Brand is not specified.')

  return brand.id
}

const models = {
  deals: DealsQueryBuilder(Deals),
  contact_joint_export: ContactJointExportQueryBuilder
}

async function aggregate(req, res) {
  /** @type {'deals'} */
  const cube_name = req.params.cube
  const {drilldown, filter} = req.body

  if (!models.hasOwnProperty(cube_name))
    throw Error.ResourceNotFound('Model name not found.')

  try {
    const queryBuilder = new models[cube_name](drilldown, filter, req.user.id, getCurrentBrand())

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

    const options = {}

    if (Array.isArray(fields)) options.fields = fields
    if (typeof query === 'object') Object.assign(options, query)

    const rows = await queryBuilder.facts(options)

    if (rows.length > 0)
      headers = headers || await queryBuilder.headerMapper(rows[0])
    else
      headers = []

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

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/analytics/:cube/aggregate', auth, am(aggregate))
  app.post('/analytics/:cube/facts', auth, am(facts))
  app.get('/analytics/:cube/model', auth, getModel)
}

module.exports = router
