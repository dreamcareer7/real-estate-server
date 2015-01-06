var files = [
  './Error.js',
  './Address.js',
  './User.js',
  './Event.js',
  './Agency.js',
  './Session.js',
  './Client.js',
  './Token.js',
  './Property.js',
  './Listing.js',
  './Shortlist.js',
  './Feed.js',
  './Recommendation.js',
  './Favorite.js',
  './Url.js',
  './Contact.js'
];

module.exports = function(app) {
  for(var i in files)
    require(files[i]);
}