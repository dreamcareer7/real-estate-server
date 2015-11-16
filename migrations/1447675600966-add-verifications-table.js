'use strict';

var db = require('../lib/utils/db');

var sql_up = 'CREATE TABLE public.verifications\
(\
  id uuid DEFAULT uuid_generate_v1(),\
  code character(5),\
  user_id uuid,\
  CONSTRAINT verification_user_id_fkey FOREIGN KEY (user_id)\
REFERENCES public.users (id) MATCH SIMPLE\
ON UPDATE NO ACTION ON DELETE NO ACTION\
)\
WITH (\
  OIDS=FALSE\
);\
ALTER TABLE public.tokens\
OWNER TO postgres;\
CREATE UNIQUE INDEX verifications_user_id_idx\
ON public.verifications\
USING btree\
(user_id);';

var sql_down = 'DROP TABLE public.verifications';

var runSql = (sql) => {
  return (next) => {
    db.conn((err, client) => {
      if (err)
        return next(err);

      return client.query(sql, next);
    });
  };
};

exports.up = runSql(sql_up);
exports.down = runSql(sql_down);
