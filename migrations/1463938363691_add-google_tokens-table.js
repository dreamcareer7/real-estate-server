'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'CREATE TABLE public.google_tokens(\
  id uuid NOT NULL DEFAULT uuid_generate_v1(),\
  access_token character varying,\
  refresh_token character varying,\
  created_at timestamp with time zone DEFAULT now(),\
  expiry_date timestamp with time zone,\
  "user" uuid,\
  calendar_id character varying,\
  sync_token character varying);'
];

var down = ['DROP TABLE public.google_tokens;'];

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
