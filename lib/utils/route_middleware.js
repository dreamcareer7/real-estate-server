const validate = require('./validator.js')

function getPaginationParams (params) {
  const filter = this.res.req.query.filter

  params.type = 'Init_C'
  params.limit = parseInt(this.res.req.query.limit) || 20
  params.filter = (filter) ? filter : null

  const since_value = this.res.req.query.since_value
  const max_value = this.res.req.query.max_value
  const sorting_value = this.res.req.query.sorting_value || 'Creation'

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
  console.log('Returning model', this.req.rechat_id)

  const enabled_associations = this.req.query.associations || []

  const format = this.req.headers['x-rechat-format'] || Orm.NEST

  Orm.populate({
    models: [data],
    associations: enabled_associations,
    format
  }).nodeify((err, populated) => {
    if (err)
      return this.req.res.error(err)

    if (format === Orm.NEST) {
      return this.req.res.json({
        code: 'OK',
        data: populated[0]
      })
    }

    return this.req.res.json({
      code: 'OK',
      data: populated.data[0],
      references: populated.references
    })
  })
}

function returnCollection (models, info) {
  console.log('Returning collection', this.req.rechat_id)

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

  const enabled_associations = this.req.query.associations || []
  const format = this.req.headers['x-rechat-format'] || Orm.NEST

  Orm.populate({
    models: models.filter(Boolean),
    associations: enabled_associations,
    format
  }).nodeify((err, populated) => {
    if (err)
      return this.req.res.error(err)

    if (!info)
      info = {}

    info.count = models.length
    info.total = total || 0

    if(_hasnew)
      info.new = _new

    if (format === Orm.NEST) {
      return this.req.res.json({
        code: 'OK',
        data: populated,
        info
      })
    }

    return this.req.res.json({
      code: 'OK',
      data: populated.data,
      references: populated.references,
      info
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

function disallowIDs(req) {
  if((req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
    if(req.method === 'POST') {
      if (req.body.id) {
        throw Error.Validation('body: id fields are auto-generated. Do not provide them.')
      }
    }
    else if(req.body.id && !validate.isUUID(req.body.id)) {
      throw Error.Validation('body: id fields need to be a valid uuid')
    }

    Object.keys(req.body).map(r => {
      if(Array.isArray(req.body[r])) {
        req.body[r].map((a, i) => {
          if(a.id) {
            const d = `${r}[${i}]`

            if (req.method === 'PATCH' || req.method === 'PUT') {
              if(!validate.isUUID(a.id)) {
                throw Error.Validation(`${d}: id fields need to be a valid uuid.`)
              }
            }
            else {
              throw Error.Validation(`${d}: id fields are auto-generated. Do not provide them.`)
            }
          }
        })
      }
    })
  }
}

function middleWare (app) {
  app.use((req, res, next) => {
    disallowIDs(req)

    process.domain.req = req
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
