INSERT INTO cmas
  (
    "user",
    room,
    suggested_price,
    comment,
    main_listing,
    listings,
    lowest_price,
    median_price,
    average_price,
    highest_price,
    lowest_dom,
    median_dom,
    average_dom,
    highest_dom
  )
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id;
