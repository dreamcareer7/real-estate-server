const db = require('../../utils/db.js')

const {
  getAll
} = require('./get')

const stringSearch = function (user_id, terms, limit, room_types, cb) {
  terms = terms.map(r => {
    return '%' + r + '%'
  })

  db.query('room/string_search', [user_id, terms, limit, room_types], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, [])

    const room_ids = res.rows.map(r => {
      return r.id
    })

    getAll(room_ids, (err, rooms) => {
      if (err)
        return cb(err)

      rooms[0].total = res.rows[0].total
      return cb(null, rooms)
    })
  })
}

const stringSearchFuzzy = function (user_id, terms, limit, similarity, room_types, cb) {
  terms = terms.join('|')

  db.query('room/string_search_fuzzy', [user_id, terms, limit, similarity, room_types], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, [])

    const room_ids = res.rows.map(r => {
      return r.id
    })

    getAll(room_ids, (err, rooms) => {
      if (err)
        return cb(err)

      rooms[0].total = res.rows[0].total
      return cb(null, rooms)
    })
  })
}

module.exports = {
  stringSearchFuzzy,
  stringSearch
}
