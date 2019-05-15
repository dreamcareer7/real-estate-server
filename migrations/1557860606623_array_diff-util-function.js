const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE FUNCTION array_diff(anyarray, anyarray)
    RETURNS anyarray AS
    $BODY$
    declare
      out_arr $1%TYPE;
      el_idx int;
    begin
      if $1 is null or $2 is null then
        return $1;
      end if;
      for el_idx in array_lower($1, 1)..array_upper($1, 1) loop
        if not $1[el_idx] = any($2) then
          out_arr = array_append(out_arr, $1[el_idx]);
        end if;
      end loop;
      return out_arr;
    end;
    $BODY$
    LANGUAGE plpgsql
    IMMUTABLE
    COST 100;`,
  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
