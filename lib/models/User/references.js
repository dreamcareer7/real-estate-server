const _u = require('underscore')
const async = require('async')

const {
  getAll,
  getByEmail,
  getByPhoneNumber
} = require('./get')

/**
 * @returns {UUID[]}
 */
const combineAndUniqueUserReferences = function(
  user_id,
  users,
  emails,
  phone_numbers
) {
  const e = users || []
  const se = emails || []
  const sp = phone_numbers || []

  let combine = e
    .concat(se)
    .concat(sp)
    .filter(Boolean)
  combine = _u.uniq(combine)

  return combine
}

const combineUserReferences = function(user_id, users, emails, phones, cb) {
  let non_existing = false

  async.auto(
    {
      users: cb => {
        if (!users) return cb(null, [])

        getAll(users).nodeify((err, results) => {
          if (err) return cb(err)

          return cb(null, results.filter(Boolean))
        })
      },
      emails: cb => {
        if (!emails) return cb(null, [])

        async.map(
          emails,
          (e, cb) => getByEmail(e).nodeify(cb),
          (err, results) => {
            if (err) return cb(err)

            const s = results.filter(Boolean)
            if (emails.length !== s.length) non_existing = true

            return cb(null, s)
          }
        )
      },
      phones: cb => {
        if (!phones) return cb(null, [])

        async.map(
          phones,
          (r, cb) => {
            return getByPhoneNumber(r).nodeify(cb)
          },
          (err, results) => {
            if (err) return cb(err)

            const s = results.filter(Boolean)
            if (phones.length !== s.length) non_existing = true

            return cb(null, s)
          }
        )
      },
      check: [
        'users',
        'emails',
        'phones',
        (cb, results) => {
          const u = users ? users : []

          const e = results.emails.map(r => {
            return r.id
          })

          const p = results.phones.map(r => {
            return r.id
          })

          const r = combineAndUniqueUserReferences(user_id, u, e, p)

          return cb(null, {
            users: r,
            non_existing: non_existing
          })
        }
      ]
    },
    (err, results) => {
      if (err) return cb(err)

      return cb(null, results.check)
    }
  )
}

module.exports = {
  combineAndUniqueUserReferences,
  combineUserReferences
}
