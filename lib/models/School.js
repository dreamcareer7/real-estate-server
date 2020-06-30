const db = require('../utils/db.js')

School = {}

School.search = function (term, cb) {
  db.query('school/search', [term], (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows)
  })
}

School.getByDistrict = function (districts, cb) {
  db.query('school/district', [districts], (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows)
  })
}

School.searchDistricts = function (terms, cb) {
  const prepared = terms.map(t => '%' + t + '%')

  if (prepared.length < 1) // If there is no search term, return all.
    prepared.push('%%')

  db.query('school/search_districts', [prepared], (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows)
  })
}

School.refresh = function (cb) {
  db.query('school/refresh', [], cb)
}
