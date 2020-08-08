const db = require('../../../utils/db')

const get = (id, cb) => {
  getAll([id], (err, accounts) => {
    if(err)
      return cb(err)

    if (accounts.length < 1)
      return cb(Error.ResourceNotFound('Docusign account' + id + ' not found'))

    const account = accounts[0]

    return cb(null, account)
  })
}

const getAll = (account_ids, cb) => {
  db.query('envelope/account/get', [account_ids], (err, res) => {
    if (err)
      return cb(err)

    const accounts = res.rows

    return cb(null, accounts)
  })
}

module.exports = {
  get,
  getAll
}
