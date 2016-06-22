'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'CREATE TYPE contact_source_type AS enum (\'BrokerageWidget\', \'IOSAddressBook\', \'SharesRoom\', \'ExplicitlyCreated\');',
  'ALTER TABLE contacts ADD source_type contact_source_type;',
  'ALTER TABLE contacts ADD brand uuid REFERENCES brands(id);',
  'ALTER TYPE notification_action ADD VALUE \'CreatedFor\';'
];

var down = [
  'ALTER TABLE contacts DROP COLUMN brand;',
  'ALTER TABLE contacts DROP COLUMN source_type;',
  'DROP TYPE contact_source_type;',
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
