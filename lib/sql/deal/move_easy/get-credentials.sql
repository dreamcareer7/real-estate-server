SELECT * FROM move_easy_credentials WHERE brand IN (SELECT * FROM brand_parents($1::uuid))
