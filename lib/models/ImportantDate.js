/**
 * @namespace Idate
 */

require('../utils/require_asc.js')
require('../utils/require_html.js')

const async = require('async')
const validator = require('../utils/validator.js')
const db = require('../utils/db.js')

Idate = {}

Orm.register('important_date', Idate)

const schema = {
  type: 'object',
  properties: {
    transaction: {
      type: 'string',
      uuid: true,
      required: true
    },
    title: {
      type: 'string',
      required: true
    },
    due_date: {
      type: 'number',
      required: false
    }
  }
}

const validate = validator.bind(null, schema)

Idate.create = function (idate, cb) {
  async.auto({
    validate: function (cb) {
      return validate(idate, cb)
    },
    create: ['validate',
      function (cb, results) {
        db.query('idate/insert', [
          idate.transaction,
          idate.title,
          idate.due_date
        ], function (err, res) {
          if (err)
            return cb(err)

          return cb(null, res.rows[0].id)
        })
      }]
  }, function (err, results) {
    if (err)
      return cb(err)

    return Idate.get(results.create, cb)
  })
}

Idate.patch = (idate_id, data, cb) => {
  Idate.get(idate_id, (err, idate) => {
    if(err)
      return cb(err)

    for (const i in data)
      idate[i] = data[i]

    async.auto({
      patch: cb => {
        db.query('idate/patch', [
          idate.title,
          idate.due_date,
          idate_id
        ], cb)
      },
      get: [
        'patch',
        (cb, results) => {
          return Idate.get(idate_id, cb)
        }
      ]
    }, (err, results) => {
      if (err)
        return cb(err)

      return cb(null, results.get)
    })
  })
}

Idate.get = function(idate_id, cb) {
  db.query('idate/get', [idate_id], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Idate not found'))

    const idate = res.rows[0]
    return cb(null, idate)
  })
}

Idate.getForTransaction = function(transaction_id, cb) {
  db.query('idate/transaction', [transaction_id], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, [])

    const idate_ids = res.rows.map(function (r) {
      return r.id
    })

    async.map(idate_ids, Idate.get, function (err, idates) {
      if (err)
        return cb(err)

      return cb(null, idates)
    })
  })
}

Idate.delete = function(idate_id, cb) {
  Idate.get(idate_id, function (err) {
    if (err)
      return cb(err)

    db.query('idate/delete', [idate_id], function (err) {
      if (err)
        return cb(err)

      return cb()
    })
  })
}

Idate.publicize = function(model) {
  if (model.user) delete model.user

  return model
}

module.exports = function () {}
