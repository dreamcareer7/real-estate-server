const Email = {
  ...require('./constants'),
  ...require('./get'),
  ...require('./store'),
  ...require('./create'),
  ...require('./send'),
  ...require('./constants'),
  ...require('./events'),
}


module.exports = Email
