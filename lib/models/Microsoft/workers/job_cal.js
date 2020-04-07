const Orm = require('../../Orm')
const Context = require('../../Context')
const Slack   = require('../../Slack')

const User      = require('../../User')
const UsersJobs = require('../../UsersJob')
const MicrosoftCredential = require('../credential')


const associations = ['calendar_event.full_crm_task', 'crm_task.associations', 'crm_task.assignees', 'crm_task.reminders', 'crm_association.contact']




const syncCalendar = async (data) => {

}


module.exports = {
  syncCalendar
}