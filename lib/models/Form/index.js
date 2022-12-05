/**
 * @namespace Form
 */

if (process.env.NODE_ENV === 'tests') {
  require('./mock.js')
}

const Form = {
  ...require('./emit'),
  ...require('./get'),
  ...require('./upsert'),
  ...require('./generate')
}


module.exports = Form
