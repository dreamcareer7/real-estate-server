/**
 * @namespace Idate
 */

require('../utils/require_sql.js')
require('../utils/require_asc.js')
require('../utils/require_html.js')

const async = require('async')
const validator = require('../utils/validator.js')
const db = require('../utils/db.js')
const sql_insert = require('../sql/idate/insert.sql')
const sql_patch = require('../sql/idate/patch.sql')
const sql_get = require('../sql/idate/get.sql')
const sql_transaction = require('../sql/idate/transaction.sql')
const sql_delete = require('../sql/idate/delete.sql')

Idate = {}

Orm.register('important_date', Idate)

const schema = {
  type:       'object',
  properties: {
    transaction: {
      type:     'string',
      uuid:     true,
      required: true
    },
    title: {
      type:     'string',
      required: true
    },
    due_date: {
      type:     'number',
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
               db.query(sql_insert, [
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

Idate.patch = function (idate_id, data, cb) {
  Idate.get(idate_id, function (err, idate) {
    for (const i in data)
      idate[i] = data[i]

    async.auto({
      patch: function (cb) {
        db.query(sql_patch, [
          idate.title,
          idate.due_date,
          idate_id
        ], cb)
      },
      get: ['patch',
            function (cb, results) {
              return Idate.get(idate_id, cb)
            }]
    }, function (err, results) {
      if (err)
        return cb(err)

      return cb(null, results.get)
    })
  })
}

Idate.get = function (idate_id, cb) {
  db.query(sql_get, [idate_id], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Idate not found'))

    const idate = res.rows[0]
    return cb(null, idate)
  })
}

Idate.getForTransaction = function (transaction_id, cb) {
  db.query(sql_transaction, [transaction_id], function (err, res) {
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

Idate.delete = function (idate_id, cb) {
  Idate.get(idate_id, function (err) {
    if (err)
      return cb(err)

    db.query(sql_delete, [idate_id], function (err) {
      if (err)
        return cb(err)

      return cb()
    })
  })
}

Idate.publicize = function (model) {
  if (model.user) delete model.user

  return model
}

module.exports = function () {}
