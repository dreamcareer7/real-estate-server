/**
 * @namespace Activity
 */

const Activity = {
  ...require('./add'),
  ...require('./get'),
  ...require('./publicize')
}

module.exports = Activity
