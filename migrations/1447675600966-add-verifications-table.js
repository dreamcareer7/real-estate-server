'use strict';

var db = require('../lib/utils/db');

var sql_up = 'CREATE TABLE public.verification_codes\
(\
  id uuid DEFAULT uuid_generate_v1(),\
  code character(5),\
  user_id uuid,\
  CONSTRAINT verificationCode_user_id_fkey FOREIGN KEY (user_id)\
REFERENCES public.users (id) MATCH SIMPLE\
ON UPDATE NO ACTION ON DELETE NO ACTION\
)\
WITH (\
  OIDS=FALSE\
);\
ALTER TABLE public.tokens\
OWNER TO postgres;\
CREATE UNIQUE INDEX verificationCode_user_id_idx\
ON public.verification_codes\
USING btree\
(user_id);';

var sql_down = 'DROP TABLE public.verification_codes';

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
