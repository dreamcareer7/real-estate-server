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

  params.timestamp *= 1000000
}

function returnModel (data) {
  const format = this.req.headers['x-rechat-format']
  const referenced = format === 'references'
  const enabled_associations = this.req.query.associations || []

  const cache = {}
  Orm.populate(data, cache, (err, data) => {
    if (err)
      return this.req.res.error(err)

    this.req.res.json({
      code: 'OK',
      references: referenced ? cache.references : undefined,
      data: data
    })
  }, enabled_associations, referenced)
}

function returnCollection (models, info) {
  const format = this.req.headers['x-rechat-format']
  const referenced = format === 'references'

  let total = 0
  let _new = 0
  let _hasnew = false

  if (models[0] && models[0].hasOwnProperty('total')) {
    total = models[0].total
    delete models[0].total
  }

  if (models[0] && models[0].hasOwnProperty('new')) {
    _new = models[0].new
    _hasnew = true
    delete models[0].new
  }

  models = models.filter(Boolean)

  const enabled_associations = this.req.query.associations || []

  const cache = {}
  const prepare = (model, cb) => {
    Orm.populate(model, cache, cb, enabled_associations, referenced)
  }

  async.mapSeries(models, prepare, (err, models) => {
    if (err)
      return this.req.res.error(err)

    if (!info)
      info = {}

    info.count = models.length
    info.total = total || 0

    if(_hasnew)
      info.new = _new

    this.req.res.json({
      code: 'OK',
      data: models,
      references: referenced ? cache.references : undefined,
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

  else if (typeof details === 'string') {
    response.message = details
  }

  this.req.res.json(response)
}

function deny(user_type) {
  const req = this
  const user = req.user

  if (!req.user)
    throw Error.Unauthorized()

  if (user.user_type === user_type)
    throw Error.Forbidden()
}

function allow(user_type) {
  const req = this
  const user = req.user

  if (!req.user)
    throw Error.Unauthorized()

  if (user.user_type === 'Admin')
    return

  if (user.user_type !== user_type)
    throw Error.Forbidden()
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
    req.access = {
      deny: deny.bind(req),
      allow: allow.bind(req)
    }
    next()
  })
}

module.exports = middleWare
