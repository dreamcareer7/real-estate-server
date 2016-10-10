const db = require('../utils/db.js')

const sql_search = require('../sql/school/search.sql')
const sql_search_districts = require('../sql/school/search_districts.sql')
const sql_refresh = require('../sql/school/refresh.sql')
const sql_district = require('../sql/school/district.sql')

School = {}

School.search = function (term, cb) {
  db.query(sql_search, [term], (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows)
  })
}

School.getByDistrict = function (districts, cb) {
  db.query(sql_district, [districts], (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows)
  })
}

School.searchDistricts = function (terms, cb) {
  const prepared = terms.map(t => '%' + t + '%')

  if (prepared.length < 1) // If there is no search term, return all.
    prepared.push('%%')

  db.query(sql_search_districts, [prepared], (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows)
  })
}

School.refresh = function (cb) {
  db.query(sql_refresh, [], cb)
}
