/**
 * @namespace Showings
 */


const Showings = {
  ...require('./get'),
  ...require('./create'),
  ...require('./delete')
}


module.exports = Showings