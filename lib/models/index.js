var files = [
  './Error.js',
  './Address.js',
  './User.js',
  './Session.js',
  './Client.js',
  './Token.js',
  './Property.js',
  './Listing.js',
  './Room.js',
  './Recommendation.js',
  './Url.js',
  './Count.js',
  './XMPP.js',
  './Contact.js',
  './Message.js',
  './Alert.js',
  './S3.js',
  './SES.js',
  './Twilio.js',
  './Invitation.js',
  './Notification.js',
  './Admin.js',
  './Crypto.js',
  './ObjectUtil.js',
  './Verification.js',
  './Branch.js',
  './Tag.js'
];

module.exports = function(app) {
  for(var i in files)
    require(files[i]);
};
