'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE TYPE activity_type AS ENUM\
   (\
     \'ViewedFullView\',\
     \'ViewedAlert\',\
     \'AlertSearch\',\
     \'FavoritedListing\',\
     \'SharedListing\',\
     \'CreatedAlert\',\
     \'CommentedOnListing\',\
     \'ViewedRecommendation\',\
     \'OpenedApp\',\
     \'CreatedTask\'\
   )\
  ',
  'CREATE TABLE activities\
   (\
     id uuid DEFAULT uuid_generate_v1() NOT NULL,\
     reference uuid NOT NULL,\
     created_at timestamp with time zone DEFAULT now(),\
     updated_at timestamp with time zone DEFAULT now(),\
     deleted_at timestamp with time zone,\
     object uuid,\
     object_class notification_object_class,\
     object_sa jsonb,\
     action activity_type\
   );'
]

const down = [
  'DROP TABLE activities',
  'DROP TYPE activity_type'
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
