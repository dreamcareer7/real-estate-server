SELECT DISTINCT (shortlist)
FROM alerts
WHERE $1 >= minimum_price AND
      $1 <= maximum_price AND
      $2 >= minimum_square_meters AND
      $2 <= maximum_square_meters AND
      $3 >= min_bedrooms AND
      $4 >= min_bathrooms;
