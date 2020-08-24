const Orm = require('../../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  submission: {
    model: 'Submission'
  }
}

Orm.register('form_template', 'FormTemplate', {
  getAll,
  associations
})
