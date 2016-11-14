const db = require('../utils/db.js')

Note = {}

Note.add = function (entity_id, user_id, note, entity_type, cb) {
  db.query('note/add_note', [entity_id, user_id, note, entity_type], function (err, res) {
    if (err)
      return cb(err)

    return cb(null, res)
  })
}

Note.get = function (entity_id, user_id, cb) {
  db.query('note/get_notes', [entity_id, user_id], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, false)

    return cb(null, res.rows)
  })
}

Note.remove = function (note_id, cb) {
  db.query('note/remove_note', [note_id], cb)
}

module.exports = function () {

}

