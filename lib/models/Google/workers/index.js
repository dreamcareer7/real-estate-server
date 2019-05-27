module.exports = {
  ...require('./profile'),
  ...require('./contact'),
  ...require('./contact_group'),
  ...require('./message'),
  ...require('./thread')
}


// const { combineHandlers } = require('../../../utils/worker')

// const profiles       = require('./profile')
// const contacts       = require('./contact')
// const contact_groups = require('./contact_group')
// const messages       = require('./message')
// const threads        = require('./thread')

// module.exports = combineHandlers({
//   profiles,
//   contacts,
//   contact_groups,
//   messages,
//   threads
// })