SELECT BOOL_OR(
         object = $1 AND
         referred_shortlist = $2
       ) AS is_dup
FROM recommendations;
