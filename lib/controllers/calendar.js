var config = require('../config.js');
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

var SCOPES = ['https://www.googleapis.com/auth/calendar','https://www.google.com/m8/feeds','https://www.googleapis.com/auth/gmail.modify'];

function initCalendar(req, res) {
  var user_id = req.user ? req.user.id : '6019ce36-fa90-11e5-b6ca-14109fd0b9b3';
  GoogleToken.getByUser(user_id, function (err, token) {
    if (err) {
      authorize(user_id, res);
    } else {
      var auth = new googleAuth();
      var oauth2Client = new auth.OAuth2(config.google.client_id, config.google.client_secret);
      oauth2Client.credentials = {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expiry_date: token.expiry_date,
        token_type: "Bearer",
      };
      var events = Task.fetchGoogleEvents(oauth2Client);
      res.send(typeof events);
      res.end();
      //check if token requires refresh
    }
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
      res.sen
      res.send(oauth2Client);
      console.log('Error while trying to retrieve access token' + err);
      res.end();
    } else {
      GoogleToken.create({
        user: user_id,
        access_token:token.access_token,
        refresh_token: token.refresh_token,
        expiry_date: new Date(token.expiry_date).toISOString()}, function(err, google_token){
        if(err){
          res.send(err);
          res.end();
        }else{
          res.send(google_token);
          res.end();
        }
      }
    );
      //sync tasks
      //return token list
    }
  });
}

function authorize(user_id, res) {
  console.log(user_id);
  var redirectUrl = 'http://localhost:3078/calendar/callback?user=' + Crypto.encrypt(user_id);

  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(config.google.client_id, config.google.client_secret, redirectUrl);

  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });

  res.redirect(authUrl);
}

function listEvents(auth) {
  var calendar = google.calendar('v3');
  calendar.events.list({
    auth: auth,
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime'
  }, function (err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }else {
      return response.items;
    }
  });
}

function addEvent(auth) {
  var calendar = google.calendar('v3');
  calendar.events.insert({
    auth: auth,
    calendarId: 'primary',
    resource: event,
  }, function (err, event) {
    if (err) {
      console.log('There was an error contacting the Calendar service: ' + err);
      return;
    }
    console.log('Event created: %s', event.htmlLink);
  });
}

function addCalendar(auth) {
  var calendar = google.calendar('v3');
  calendar.calendars.insert({
    auth: auth,
    resource: {summary: "test calendar 2"}
  }, function (err, cal) {
    if (err) {
      console.log('There was an error contacting the Calendar service: ' + err);
      return;
    }
    console.log('Calendar created: %s', cal.id);
  });
}

function listCalendars(auth) {
  var calendar = google.calendar('v3');
  calendar.calendars.list({
    auth: auth,
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime'
  }, function (err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var calendars = response.items;
    return calendars;
  });
}

function test(req, res) {
  //var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  var date = new Date(1462029034406);
  res.send(date);
  res.end();
}

var router = function (app) {
  var b = app.auth.bearer;

  app.get('/calendar/init', initCalendar);
  app.get('/calendar/callback', callback);
  app.get('/calendar/test', test);
};


module.exports = router;