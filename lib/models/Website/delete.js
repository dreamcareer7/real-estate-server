const db = require('../../utils/db.js')

const { get } = require('./get')


const deleteHostname = function({website, hostname}, cb) {
  db.query('website/delete_hostname', [
    website,
    hostname
  ], err => {
    if (err) {
      return cb(err)
    }

    get(website, cb)
  })
}


module.exports = {
  deleteHostname
}