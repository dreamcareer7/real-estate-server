const Room = {
  ...require('./get'),
  ...require('./create'),
  ...require('./consts'),
  ...require('./users/get'),
  ...require('./users/add'),
  ...require('./users/remove'),
  ...require('./recommendation'),
  ...require('./compose'),
  ...require('./update'),
  ...require('./search'),
  ...require('./branch'),
  ...require('./notification')
}

module.exports = Room
