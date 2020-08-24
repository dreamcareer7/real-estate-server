const db = require('../../utils/db.js')


const get = function (id, cb) {
  getAll([id], (err, websites) => {
    if (err) {
      return cb(err)
    }

    if (websites.length < 1) {
      return cb(Error.ResourceNotFound(`Website ${id} not found`))
    }

    const website = websites[0]

    return cb(null, website)
  })
}

const getAll = function(website_ids, cb) {
  db.query('website/get', [website_ids], (err, res) => {
    if (err) {
      return cb(err)
    }

    const websites = res.rows

    return cb(null, websites)
  })
}

const getByUser = function (user_id, cb) {
  db.query('website/get_user', [user_id], (err, res) => {
    if (err) {
      return cb(err)
    }

    const website_ids = res.rows.map(r => r.id)

    getAll(website_ids, (err, websites) => {
      if (err) {
        return cb(err)
      }

      return cb(null, websites)
    })
  })
}

const getByHostname = function (hostname, cb) {
  db.query('website/get_hostname', [hostname], (err, res) => {
    if (err) {
      return cb(err)
    }

    if (res.rows.length < 1) {
      return cb(Error.ResourceNotFound('Website ' + hostname + ' not found'))
    }

    return get(res.rows[0].website, cb)
  })
}

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
  get,
  getAll,
  getByUser,
  getByHostname,
  deleteHostname
}