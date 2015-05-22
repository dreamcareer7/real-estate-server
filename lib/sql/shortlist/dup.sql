SELECT BOOL_OR(
         referred_shortlist = $1 AND
         object = $2
       ) AS is_dup
FROM recommendations;
