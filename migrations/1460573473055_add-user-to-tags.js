'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = [
  'ALTER TABLE public.tags ADD COLUMN "user" uuid;',
  'ALTER TABLE public.tags\
  ADD CONSTRAINT tags_user_fkey FOREIGN KEY ("user")\
  REFERENCES public.users (id) MATCH SIMPLE\
  ON UPDATE NO ACTION ON DELETE NO ACTION;',
  'DROP INDEX tags_entity_tag_type_idx',
  'CREATE UNIQUE INDEX tags_entity_tag_type_user_idx ON public.tags\
  USING btree (entity, tag COLLATE pg_catalog."default", type, "user");',
  'UPDATE Tags SET "user" = (SELECT "user" FROM contacts WHERE contacts.id = tags.entity);'
];

var down = [
  'ALTER TABLE public.tags DROP COLUMN "user";',
  'CREATE UNIQUE INDEX tags_entity_tag_type_idx ON public.tags\
  USING btree (entity, tag COLLATE pg_catalog."default", type);',
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
