const db = require('../../utils/db')
const Orm = require('../Orm/registry')

const { getAll } = require('./get')

Orm.register('office', 'Office', {
  getAll
})
