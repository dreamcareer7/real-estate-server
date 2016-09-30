const async = require('async')

function getPaginationParams (params) {
  const filter = this.res.req.query.filter

  params.type = 'Init_C'
  params.limit = parseInt(this.res.req.query.limit) || 20
  params.filter = (filter) ? filter : null

  const since_value = this.res.req.query.since_value
  const max_value = this.res.req.query.max_value
  const sorting_value = this.res.req.query.sorting_value

  params.timestamp = parseFloat(since_value) || parseFloat(max_value) || (Date.now() / 1000)

  if (sorting_value === 'Creation') {
    if (since_value)
      params.type = 'Since_C'
    else if (max_value)
      params.type = 'Max_C'
    else
      params.type = 'Init_C'
  } else if (sorting_value === 'Update') {
    if (since_value)
      params.type = 'Since_U'
    else if (max_value)
      params.type = 'Max_U'
    else
      params.type = 'Init_U'
  }

  if (since_value)
    params.timestamp -= 0.001
  else
    params.timestamp += 0.001

  params.timestamp *= 1000000
}

function returnModel (data) {
  Orm.populate(data, {}, (err, data) => {
    if (err)
      return this.req.res.error(err)

    this.req.res.json({
      code: 'OK',
      data: data
    })
  })
}

function returnCollection (models, info) {
  let total = 0
  if (models[0] && models[0].total) {
    total = models[0].total
    delete models[0].total
  }

  models = models.filter(Boolean)

  const enabled_associations = ObjectUtil.queryStringArray(this.req.query.associations)

  const cache = {}
  const prepare = (model, cb) => {
    Orm.populate(model, cache, cb, enabled_associations)
  }

  async.mapSeries(models, prepare, (err, models) => {
    if (err)
      return this.req.res.error(err)

    if (!info)
      info = {}

    info.count = models.length
    info.total = total || 0

    this.req.res.json({
      code: 'OK',
      data: models,
      info: info
    })
  })
}

function returnError (err) {
  throw err
}

function returnSuccess (details) {
  const response = {
    data: 'OK'
  }

  if (typeof details === 'object') {
    for (const i in details)
      response[i] = details[i]
  }

  else if (typeof details == 'string') {
    response.message = details
  }

  this.req.res.json(response)
}

function middleWare (app) {
  app.use(function (req, res, next) {
    process.domain.req = req
    req.time = new Date()
    req.pagination = getPaginationParams
    res.model = returnModel
    res.collection = returnCollection
    res.error = returnError
    res.success = returnSuccess
    next()
  })
}

module.exports = middleWare
