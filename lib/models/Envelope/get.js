const db = require('../../utils/db')

const get = function (id, cb) {
  getAll([id], (err, envelopes) => {
    if(err)
      return cb(err)

    if (envelopes.length < 1)
      return cb(Error.ResourceNotFound('Envelope ' + id + ' not found'))

    const envelope = envelopes[0]

    cb(null, envelope)
  })
}

const getAll = function(envelope_ids, cb) {
  db.query('envelope/get', [envelope_ids], (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows)
  })
}

const getByDeal = (deal_id, cb) => {
  db.query('envelope/get_deal', [
    deal_id
  ], (err, res) => {
    if (err)
      return cb(err)

    getAll(res.rows.map(e => e.id), cb)
  })
}

module.exports = {
  get,
  getAll,
  getByDeal
}
