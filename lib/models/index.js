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
  './Recommendation.js',
  './Url.js',
  './Count.js',
  './XMPP.js',
  './Contact.js',
  './MessageRoom.js',
  './Message.js',
  './Alert.js',
  './S3.js',
  './Invitation.js',
  './Notification.js'
];

module.exports = function(app) {
  for(var i in files)
    require(files[i]);
}