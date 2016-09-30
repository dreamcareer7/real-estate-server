const db = require('../utils/db.js')

Note = {}

const sql_add_note = require('../sql/note/add_note.sql')
const sql_get_Notes = require('../sql/note/get_notes.sql')
const sql_remove_note = require('../sql/note/remove_note.sql')

Note.add = function (entity_id, user_id, note, entity_type, cb) {
  db.query(sql_add_note, [entity_id, user_id, note, entity_type], function (err, res) {
    if (err)
      return cb(err)

    return cb(null, res)
  })
}

Note.get = function (entity_id, user_id, cb) {
  db.query(sql_get_Notes, [entity_id, user_id], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, false)

    return cb(null, res.rows)
  })
}

Note.remove = function (note_id, cb) {
  db.query(sql_remove_note, [note_id], cb)
}

module.exports = function () {

}

