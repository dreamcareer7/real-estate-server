const moment = require('moment')

const promisify = require('../../../utils/promisify')
const Mailer = require('../../../utils/mailer')

const Branch = require('../../Branch')
const Url = require('../../Url')

const BRANCH_ACTION = 'RedirectToCRMTask'

/**
 * Creates a Branch link for the task
 * @param {UUID} task_id Main task id
 * @param {UUID} user_id User receiving the notification
 * @param {string} email User's email
 */
async function getBranchLink(task_id, user_id, email) {
  const url = Url.web({
    uri: '/branch'
  })

  return promisify(Branch.createURL)({
    action: BRANCH_ACTION,
    receiving_user: user_id,
    email: email,
    crm_task: task_id,
    $desktop_url: url,
    $fallback_url: url
  })
}

class TaskMailer extends Mailer {
  get subject() {
    return 'New messages on Rechat'
  }

  get to() {
    return this.object.user.email
  }

  /**
   * Renders email html
   * @protected
   * @returns {Promise<string>}
   */
  async render() {
    const { user, task } = this.object

    /** @type {string} */
    const branch_link = await getBranchLink(task.id, user.id, user.email)
    const due_date = moment(task.due_date * 1000)

    return promisify(Template.render)(__dirname + '/../../../html/crm/task/layout.html', {
      user: task.created_by,
      task: task,
      due_date: due_date.format('MMMM Do, YYYY [at] HH:mm A'),
      link: branch_link
    })
  }
}

module.exports = TaskMailer
