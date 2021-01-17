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

const deleteWebsite = function(id, cb) {
  db.query('website/delete', [
    id
  ], cb)
}

module.exports = {
  deleteHostname,
  delete: deleteWebsite
}
