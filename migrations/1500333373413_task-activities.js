'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',

  'ALTER TYPE activity_type ADD VALUE \'UserUpdatedSubmission\''
  'ALTER TYPE activity_type ADD VALUE \'UserCompletedSubmission\''
  'ALTER TYPE notification_object_class ADD VALUE \'Submission\''

  'ALTER TYPE activity_type ADD VALUE \'UserSubmittedReview\''
  'ALTER TYPE activity_type ADD VALUE \'UserRejectedReview\''
  'ALTER TYPE activity_type ADD VALUE \'UserApprovedReview\''
  'ALTER TYPE notification_object_class ADD VALUE \'Review\''

  'ALTER TABLE reviews_history ALTER status DROP DEFAULT',

  'COMMIT'
]

const down = [
]

const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), next)
  })
}

const run = (queries) => {
  return (next) => {
    runAll(queries, next)
  }
}

exports.up = run(up)
exports.down = run(down)
