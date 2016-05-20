var config = require('../config.js');
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var moment = require('moment');
var uuid = require('node-uuid');


var SCOPES = ['https://www.googleapis.com/auth/calendar'];


function initCalendar(req, res) {
  var user_id = req.user ? req.user.id : '6019ce36-fa90-11e5-b6ca-14109fd0b9b3';

  GoogleToken.getByUser(user_id, function (err, token) {
    if (err) {
      authorize(user_id, res);
    } else {
      //check if token requires refresh
      res.end();
    };
  });
}

function callback(req, res) {
  var redirectUrl = 'http://localhost:3078/calendar/callback?user=wU6c8WtJEST6jdyKQ35yValzm+ibd1WSXDJbfoQEZSKLAiZ9';
  var user_id = req.user ? req.user.id : '6019ce36-fa90-11e5-b6ca-14109fd0b9b3';
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(config.google.client_id, config.google.client_secret, redirectUrl);
  oauth2Client.access_type = 'offline';

  oauth2Client.getToken(req.query.code, function (err, token) {

    if (err) {
      return res.error(err);
    } else {
      //create Rechat calendar
      oauth2Client.credentials = token;
      GoogleToken.addRechatCalendar(oauth2Client, function (err, calendar_id) {
        if (err) {
          return res.error(err);
        } else {
          //save user's google information
          GoogleToken.create({
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
                    Task.fetchGoogleEvents(user_id,null,function(err, result){
                      if(err){
                        return res.error(err);
                      } else{
                        res.send('Done.')
                        res.end();
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

function authorize(user_id, res) {
  var redirectUrl = 'http://localhost:3078/calendar/callback?user=' + Crypto.encrypt(user_id);

  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(config.google.client_id, config.google.client_secret, redirectUrl);

  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });

  res.redirect(authUrl);
}


function getNotify(req, res){
  var resource_id = req.get('x-goog-channel-id');
  GoogleToken.getByUser(resource_id, function(err, token){
    if(err){
      return res.error(err);
    } else{
      Task.fetchGoogleEvents(token.user,token.sync_token, function(err, events){
        if(err){
          return res.error(err);
        } else{
          res.send(events);
          res.end();
        }
      });
    }
  });
};

function test(req, res) {
  var user_id = '6019ce36-fa90-11e5-b6ca-14109fd0b9b3';
  GoogleToken.getByUser('6019ce36-fa90-11e5-b6ca-14109fd0b9b3', function(err, token){
    if(err){
      return cb(err);
    } else{
      GoogleToken.createOauthForUser(user_id, function(err, auth){
        if(err){
          return cb(err);
        } else{
          var calendar = google.calendar('v3');

          calendar.events.watch({

            auth:auth,
            resource: {
              id: user_id,
              type: 'web_hook',
              address: "https://test.rechat.com/calendar/notifications"
            },
            calendarId: token.calendar_id
          }, function(error, response) {
            if (error) {
              res.send(error);
              res.end();
            }
            res.send(response);
            res.end();
          });
        }
      });
    }
  });
};


var router = function (app) {
  var b = app.auth.bearer;

  app.get('/calendar/init', initCalendar);
  app.get('/calendar/callback', callback);
  app.get('/calendar/test', test);
  app.post('/calendar/notifications', getNotify)
};


module.exports = router;