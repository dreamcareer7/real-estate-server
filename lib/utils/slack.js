var request = require('request');
var config = require('../config.js');
var format = require('util').format;

function reportToSlack(channel, text) {
  var payload = {
    channel: '#'+channel,
    username: config.slack.this,
    icon_emoji: ':house:',
    text: text
  };

  var headers = {
    'User-Agent': 'Super Agent/0.0.1',
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  var options = {
    url: config.slack.webhook,
    method: 'POST',
    headers: headers,
    form: {
      payload:JSON.stringify(payload)
    }
  };

  request.post(options, function(err, res, body) {
    if(err) {
      console.log('Error sending update to slack:', err);
    }
  });
}

var reportActivity = (text) => {
  reportToSlack('support', text);
};

function reportHttpError(req, e) {
  if(!e.http)
    e.http = 500;

  if(e.http < 500)
    return ;

  delete e.domain;
  delete e.domainThrown;
  delete e.domainEmitter;
  delete e.domainBound;

  var user = req.user ? (req.user.first_name + ' ' + req.user.last_name) : 'Guest';
  var text = ':x: <%s> %s %s (Error %d)\n :memo: %s\n:person_with_blond_hair::skin-tone-5: %s (%s)\n---\n';
  text = format(text, req.rechat_id, req.method, req.headers['host']+req.path, e.http, e.message, user, req.headers['user-agent']);
  reportToSlack('server-errors', text);
}

function middleware(req, res, next) {
  process.domain.on('error', reportHttpError.bind(null, req));
  next();
}

function reportSocketError(e, domain) {
  if(!e.http)
    e.http = 500;

  delete e.domain;
  delete e.domainThrown;
  delete e.domainEmitter;
  delete e.domainBound;

  var user = process.domain.user ? (process.domain.user.first_name + process.domain.user.last_name) : 'Guest';
  var socket = process.domain.socket;
  var headers = socket.request.headers;

  var text = ':x: Socket:%s %s (Error %s)\n :memo: %s\n:person_with_blond_hair::skin-tone-5: %s (%s)\n---\n';
  text = format(text, process.domain.function, headers['host'], e.http, e.message, user, headers['user-agent']);
  reportToSlack(text);
}

var userCreated = (user_id) => {
  User.get(user_id, (err, user) => {
    if(err)
      return console.trace(err);

    var text = format('New User: %s %s (%s) as %s', user.first_name, user.last_name, user.email, user.user_type);

    return reportActivity(text);
  });
};

var displayName = () => {
  var user = process.domain.user;

  if(user)
    return user.first_name + ' ' +user.last_name;

  return 'Unknown User';
};

var emailVerificationSent = (verification, email) => {
  var text = format('Email verification code sent to %s as requested by %s', verification.email, displayName());
  reportActivity(text);
};

var phoneVerificationSent = (verification) => {
  var text = format('Phone verification code sent to %s as requested by %s', verification.phone_number, displayName());
  reportActivity(text);
};

var emailVerified = (email) => {
  var text = format('Email %s verified (by user %s)', email, displayName());
  reportActivity(text);
};

var phoneVerified = (phone_number) => {
  var text = format('Phone %s verified (by user %s)', phone_number, displayName());
  reportActivity(text);
};

module.exports = (app) => {
  if(process.env.NODE_ENV !== 'production')
    return ;

  app.use(middleware);

  EmailVerification.on('email verification sent', emailVerificationSent);
  PhoneVerification.on('phone verification sent', phoneVerificationSent);

  EmailVerification.on('email verified', emailVerified);
  PhoneVerification.on('phone verified', phoneVerified);

  User.on('user created', userCreated);


  //We need SocketServer. Its not defined yet. It will be loaded 'after loading routes'.
  app.on('after loading routes', () => {
    SocketServer.on('transaction', (domain) => {
      domain.on('error', (e) => {
        reportSocketError(e, domain);
      });
    });
  });
};
