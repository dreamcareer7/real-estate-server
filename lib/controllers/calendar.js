var config = require('../config.js');
var fs = require('fs');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var moment = require('moment');


var SCOPES = ['https://www.googleapis.com/auth/calendar'];


function initCalendar(req, res) {
  var user_id = req.user.id;

  Google.getByUser(user_id, function (err, token) {
    if (err) {
      authorize(user_id, res);
    } else {
      //check if token requires refresh
      res.end();
    }
    ;
  });
};

function authorize(user_id, res) {
  var redirectUrl = config.google.redirect_uris[0] + Crypto.encrypt(user_id);

  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(config.google.client_id, config.google.client_secret, redirectUrl);

  var authUrl = oauth2Client.generateAuthUrl({
    access_type: config.google.access_type,
    scope: config.google.scopes
  });
  console.log(authUrl);
  res.redirect(authUrl);
};

function callback(req, res) {
  var user_id = Crypto.decrypt(req.query.user.replace(/ /g, '+'));
  var redirectUrl = config.google.redirect_uris[0] + Crypto.encrypt(user_id);
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(config.google.client_id, config.google.client_secret, redirectUrl);
  oauth2Client.access_type = config.google.access_type;

  oauth2Client.getToken(req.query.code, function (err, token) {

    if (err) {
      return res.error(err);
    } else {
      //create Rechat calendar
      oauth2Client.credentials = token;
      Google.addRechatCalendar(oauth2Client, function (err, calendar_id) {
        if (err) {
          return res.error(err);
        } else {
          //save user's google information
          Google.create({
              user: user_id,
              access_token: token.access_token,
              refresh_token: token.refresh_token,
              expiry_date: new Date(token.expiry_date).toISOString(),
              calendar_id: calendar_id
            }, function (err, google_token) {
              if (err) {
                return res.error(err);
              } else {
                Task.getForUser(user_id, null, function (err, tasks) {
                  if (err) {
                    return res.error(err);
                  } else {
                    //sync tasks
                    for (var i = 0, len = tasks.length; i < len; i++) {
                      Task.addToCalendar(user_id, tasks[i].id, Task.toCalendarEvent(tasks[i]), function (err, event_id) {
                        if (err) {
                          return res.error(err);
                        }
                      });
                    }
                    Google.getByUser(user_id, function (err, token) {
                      if (err) {
                        return cb(err);
                      } else {
                        Google.createOauthForUser(user_id, function (err, auth) {
                          if (err) {
                            return cb(err);
                          } else {
                            var calendar = google.calendar('v3');

                            calendar.events.watch({

                              auth: auth,
                              resource: {
                                id: user_id,
                                type: 'web_hook',
                                address: config.google.web_hook
                              },
                              calendarId: token.calendar_id
                            }, function (error) {
                              if (error) {
                                return res.error(error);
                                res.end();
                              }
                              res.end();
                            });
                          }
                        });
                      }
                    });
                  }
                });
              }
            }
          );
        }
      });
    }
  });
};


function getNotify(req, res) {
  var resource_id = req.get('x-goog-channel-id');
  Google.getByUser(resource_id, function (err, token) {
    if (err) {
      return res.error(err);
    } else {
      Task.fetchGoogleEvents(token.user, token.sync_token, function (err, events) {
        if (err) {
          return res.error(err);
        } else {
          res.send(events);
          res.end();
        }
      });
    }
  });
};


var router = function (app) {
  var b = app.auth.bearer;

  app.get('/calendar/init', b(initCalendar));
  app.get('/calendar/callback', callback);
  app.post('/calendar/notifications', getNotify);
};


module.exports = router;