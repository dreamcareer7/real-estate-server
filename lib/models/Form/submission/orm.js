const Orm = require('../../Orm/registry')

const { getAll } = require('./get')


const associations = {
  file: {
    model: 'AttachedFile'
  }
}

Orm.register('form_submission', 'Submission', {
  getAll,
  associations
})