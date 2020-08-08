const db = require('../../../utils/db')

const get = (id, cb) => {
  getAll([id], (err, recipients) => {
    if(err)
      return cb(err)

    if (recipients.length < 1)
      return cb(Error.ResourceNotFound('Envelope recipient' + id + ' not found'))

    const recipient = recipients[0]

    return cb(null, recipient)
  })
}

const getAll = (recipient_ids, cb) => {
  db.query('envelope/recipient/get', [recipient_ids], (err, res) => {
    if (err)
      return cb(err)

    const recipients = res.rows

    return cb(null, recipients)
  })
}

module.exports = {
  get,
  getAll
}
