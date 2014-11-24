var passport = require('passport');

module.exports = function(app) {
  app.use(passport.initialize());
  require('./oauth2.js')(app, passport);
  require('./strategies.js')(app, passport);
  app.use(passport.authenticate(['bearer'], {session:false}));
}