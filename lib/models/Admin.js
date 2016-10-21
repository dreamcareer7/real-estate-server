/**
 * @namespace Admin
 */

const db = require('../utils/db.js')

const sql_listing_count_total = require('../sql/admin/listing_count_total.sql')
const sql_terminate_user = require('../sql/admin/terminate_user.sql')
const sql_remove_phone = require('../sql/admin/remove_phone.sql')
const sql_list_phones = require('../sql/admin/list_phones.sql')

Admin = {}

/**
 * Returns total number of `Listing` objects recorded on Rechat with a specified status
 * @name totalListings
 * @function
 * @memberof Admin
 * @instance
 * @public
 * @param {Listing#listing_status} status - listings with this status will be considered
 * @param {callback} cb - callback function
 * @returns {number} number of listings having supplied status
 */
Admin.totalListings = function (status, cb) {
  if (!status)
    status = 'Any'

  db.query(sql_listing_count_total, [status], function (err, res) {
    if (err)
      return cb(err)

    return cb(null, res.rows[0].total_count)
  })
}

Admin.terminateUser = function (user_id, cb) {
  db.query(sql_terminate_user, [user_id], cb)
}

Admin.removePhone = function(user_id, cb) {
  db.query(sql_remove_phone, [user_id], cb)
}

Admin.listPhones = function(cb) {
  db.query(sql_list_phones, [], (err, res) => {
    if(err)
      return cb(err)

    return cb(null, res.rows)
  })
}

module.exports = function () {}
