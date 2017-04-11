# Group Recommendation

A `Recommendation` is a listing, recommended to a `Room`.
Each room member will be able to discard, favorite, comment it.


## Get Feed [GET /rooms/{id}/recs/feed]
Series of recommendations you havent seen already
<!-- include(tests/recommendation/feed.md) -->

## Get Faviroted items [GET /rooms/{id}/recs/favorites]
Recommendation's you have marked as favorite (Loved)
<!-- include(tests/recommendation/getFavorites.md) -->


## Mark as Seen [DELETE /rooms/{rid}/recs/feed/{id}]
<!-- include(tests/recommendation/markAsSeen.md) -->

## Mark as Favorite [PATCH /rooms/{rid}/recs/{id}/favorite]
<!-- include(tests/recommendation/markAsFavorite.md) -->

## Recommend Manually [POST /rooms/{id}/recs]
You can recommend (share) an item with others.
<!-- include(tests/recommendation/recommendManually.md) -->