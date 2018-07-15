const moment = require('moment-timezone')

const config = require('../../../config')
const promisify = require('../../../utils/promisify')
const Mailer = require('../../../utils/mailer')

const Branch = require('../../Branch')
const { Listing } = require('../../Listing')
const Url = require('../../Url')
const Render = require('../../../utils/render')


const BRANCH_ACTION = 'RedirectToCRMTask'

const WEBAPP_BASE_URL = `${config.webapp.protocol}://${config.webapp.hostname}`
const DEFAULT_CONTACT_ICON = `${WEBAPP_BASE_URL}/static/email-templates/crm_task/icons/contact.png`
const DEFAULT_DEAL_ICON = `${WEBAPP_BASE_URL}/static/email-templates/crm_task/icons/home.png`
const DEFAULT_LISTING_ICON = `${WEBAPP_BASE_URL}/static/email-templates/crm_task/icons/home.png`

const LAYOUT_PATH = __dirname + '/../../../html/crm/task/layout.html'

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
    return 'Reminder: ' + this.object.task.title
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

    if (moment.tz.zone(user.timezone))
      due_date.tz(user.timezone)

    const associations = (task.associations || []).map(assoc => {
      switch (assoc.association_type) {
        case 'contact':
          const {email, phone_number, display_name, profile_image_url} = assoc.contact.summary
          return {
            icon: profile_image_url || DEFAULT_CONTACT_ICON,
            title: display_name,
            subtitle: [email, phone_number].join(', ')
          }
        case 'deal':
          if (assoc.deal.mls_context) {
            const { photo, street_address } = assoc.deal.mls_context
            return {
              icon: photo || DEFAULT_DEAL_ICON,
              title: street_address,
              subtitle: `${assoc.deal.deal_type} Deal`
            }
          }

          return {
            icon: DEFAULT_DEAL_ICON,
            title: 'Deal',
            subtitle: `${assoc.deal.deal_type} Deal`
          }
        case 'listing':
          const {street_number, street_dir_prefix, street_name, street_suffix} = assoc.listing.property.address
          const { bedroom_count, bathroom_count } = assoc.listing.property

          const subtitle_parts = []

          if (assoc.listing.price)
            subtitle_parts.push(`$${Math.round(assoc.listing.price / 1000)}k`)
          
          if (bedroom_count)
            subtitle_parts.push(`${bedroom_count}b`)
          
          if (bathroom_count)
            subtitle_parts.push(`${bathroom_count}bths`)

          if (assoc.listing.property.square_meters)
            subtitle_parts.push(Listing.getSquareFeet(assoc.listing.property.square_meters))

          return {
            icon: assoc.listing.cover_image_url || DEFAULT_LISTING_ICON,
            title: [street_number, street_dir_prefix, street_name, street_suffix].join(' '),
            subtitle: subtitle_parts.join(', ')
          }
        default:
          break
      }
    })

    return promisify(Render)(LAYOUT_PATH, {
      user: task.created_by,
      task: task,
      due_date: due_date.format('MMMM Do, YYYY [at] hh:mm A'),
      associations,
      link: branch_link
    })
  }
}

module.exports = TaskMailer
