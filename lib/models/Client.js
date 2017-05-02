const db = require('../utils/db.js')

Client = {}

Client.get = function (id, cb) {
  Client.getAll([id], (err, clients) => {
    if (err)
      return cb(err)

    if (clients.length < 1)
      return cb(Error.ResourceNotFound(`Client ${id} not found`))

    const client = clients[0]
    cb(null, client)
  })
}

Client.getAll = function(client_ids, cb) {
  db.query('client/get', [client_ids], (err, res) => {
    if (err)
      return cb(err)

    const clients = res.rows

    return cb(null, clients)
  })
}

module.exports = function () {}
