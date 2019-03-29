const fs = require('fs')
const os = require('os')
const path = require('path')

const promisify = require('../../lib/utils/promisify')
const { runInContext } = require('../../lib/models/Context/util')

require('../../lib/models/CRM/Task/index')
const TaskMailer = require('../../lib/models/CRM/Task/mailer')
const Notification = require('../../lib/models/Notification')
const Orm = require('../../lib/models/Orm')

const HOME = os.homedir()

async function mailer_for(id) {
  let n = await promisify(Notification.get)(id)
  const pop = await Orm.populate({
    models: [n],
    associations: [
      'crm_task.assignees',
      'crm_task.associations',
      'crm_association.contact',
      'crm_association.deal',
      'crm_association.listing',
      'contact.summary'
    ]
  })
  n = pop[0]

  const user = n.subjects[0]
  const task = n.objects[0]
  const mailer = new TaskMailer({ user, task, notification: n })
  return mailer
}

async function run(program) {
  if (program.notification) {
    const mailer = await mailer_for(program.notification)
    fs.writeFileSync(
      path.resolve(HOME, 'Documents/b.html'),
      await mailer.render()
    )
  }
}

runInContext('test-task-emails', run, program => {
  program.option('-n, --notification <notification>', 'notification uuid')
}).then(
  () => console.log('Success!'),
  (ex) => console.error(ex)
)
