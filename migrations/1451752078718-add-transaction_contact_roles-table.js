'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = ['CREATE TABLE transaction_contact_roles(\
    id uuid NOT NULL DEFAULT uuid_generate_v4(),\
  transaction_contact uuid NOT NULL,\
  role character varying NOT NULL,\
  created_at timestamp with time zone DEFAULT now())'
];

var down = ['DROP TABLE IF EXISTS transaction_contact_roles;'];

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
