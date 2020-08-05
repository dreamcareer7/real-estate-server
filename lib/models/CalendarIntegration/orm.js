const Orm = require('../Orm/registry')

const { getAll } = require('./get')


Orm.register('calendar_integration', 'CalendarIntegration', {
  getAll
})