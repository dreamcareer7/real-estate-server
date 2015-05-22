SELECT BOOL_OR(
         referred_shortlist = $1
         object = $2 AND
       ) AS is_dup
FROM recommendations;
