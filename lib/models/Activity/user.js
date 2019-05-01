const _ = require('lodash')
const async = require('async')

const { expect } = require('../../utils/validator')
const db = require('../../utils/db')

const User = require('../User')

const Activity = require('./index')

const userTimeline = function(user_id, paging, cb) {
  expect(user_id).to.be.uuid

  async.auto({
    get: cb => {
      User.get(user_id).nodeify(cb)
    },
    refs: [
      'get',
      (cb, results) => {
        const contact_refs = results.get.contacts || []
        let refs = [user_id].concat(contact_refs)
        refs = _.uniq(refs)

        return cb(null, refs)
      }
    ],
    timeline: [
      'get',
      'refs',
      (cb, results) => {
        db.query('activity/timeline', [
          results.refs,
          paging.type,
          paging.timestamp,
          paging.limit
        ], (err, results) => {
          if(err)
            return cb(err)

          const activity_ids = results.rows.map(r => r.id)

          Activity.getAll(activity_ids, (err, activities) => {
            if(err)
              return cb(err)

            if(results.rows.length > 0)
              activities[0].total = results.rows[0].total

            return cb(null, activities)
          })
        })

      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err)

    return cb(null, results.timeline)
  })
}

module.exports = {
  userTimeline
}
