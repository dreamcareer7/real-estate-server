const { Faker } = require('../../faker')
const moment = require('moment-timezone')

class Mock {

  static getCrmTaskEvent(override) {
    const defaultData = {
      brand: Faker.id(),
      created_by: Faker.id(),
      assignees: [Faker.id()],
      title: Faker.string(),
      due_date: moment().unix(),
      end_date: null,
      status: 'DONE',
      object_type: 'Email',
      task_type: 'Email',
      all_day: false,
    }

    return {
      ...defaultData,
      ...override,
    }
  }
}


module.exports = {
  Mock
}