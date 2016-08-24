'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'ALTER TABLE brands ADD search_bg_image_url text',
  'ALTER TABLE brands ADD search_headline text'
];

var down = [
  'ALTER TABLE brands DROP search_bg_image_url',
  'ALTER TABLE brands DROP search_headline'
];

var runAll = (sqls, next) => {
  db.conn( (err, client) => {
    if(err)
      return next(err);

    async.eachSeries(sqls, client.query.bind(client), next);
  });
};

var run = (queries) => {
  return (next) => {
    runAll(queries, next);
  };
};

exports.up = run(up);
exports.down = run(down);
