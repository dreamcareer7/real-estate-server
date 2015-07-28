require('../connection.js');

var config = require('../../lib/config.js');
var async = require('async');

var totalUsers = 0;

// Models
require('../../lib/models/User.js');
require('../../lib/models/SES.js');

require('../../lib/utils/require_sql.js');
require('../../lib/utils/require_asc.js');
require('../../lib/utils/require_html.js');

var html_body = require('../../lib/html/email.html');
var html_announcement = require('./announcement.html');
var text_announcement = require('./announcement.asc');
var text_subject_announcement = require('./subject_announcement.asc');

var email = {
  from: config.email.from,
  source: config.email.source,
  html_body: html_body,
  message: {
    body: {
      text: {
        data: text_announcement
      },
      html: {
        data: html_announcement
      }
    },
    subject: {
      data: text_subject_announcement
    }
  }
};

User.getAll(function(err, user_ids) {
  if(err)
    process.exit(1);

  async.mapLimit(user_ids, 5, function(r, cb) {
    totalUsers++; return User.notifyViaEmail(r, email, cb);
  }, function(err, results) {
       if(err)
         process.exit(1);
       else {
         console.log('sent announcement to', totalUsers, 'users successfully');
         process.exit(0);
       }
     });
});