/**
 * @namespace UsersJob
 */


const UsersJob = {
  ...require('./get'),
  ...require('./delete'),
  ...require('./update'),
  ...require('./lock'),
  ...require('./google'),
  ...require('./microsoft')
}


module.exports = UsersJob