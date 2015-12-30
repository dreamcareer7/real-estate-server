'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'CREATE TABLE IF NOT EXISTS task_contacts (id uuid default uuid_generate_v4() PRIMARY KEY, \
task uuid not null REFERENCES tasks(id), \
contact uuid not null REFERENCES contacts(id));',
  'ALTER TABLE task_contacts ADD UNIQUE(task, contact);'
];

var down = [
  'ALTER TABLE task_contacts DROP CONSTRAINT task_contacts_task_contact_key;',
  'DROP TABLE task_contacts;'
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
