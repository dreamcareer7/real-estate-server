const moment = require('moment-timezone')
const juice = require('juice')

const promisify = require('../../../utils/promisify')
const Mailer = require('../../../utils/mailer')

const Branch = require('../../Branch')
const { Listing } = require('../../Listing')
const Url = require('../../Url')
const render_template = require('../../../utils/render').html

const BRANCH_ACTION = 'RedirectToCRMTask'

const CALENDAR_ICONS_PATH = 'https://assets.rechat.com/mail/crm/events'
const DEFAULT_CONTACT_ICON = `${CALENDAR_ICONS_PATH}/contact.png`
const DEFAULT_DEAL_ICON = `${CALENDAR_ICONS_PATH}/home.png`
const DEFAULT_LISTING_ICON = `${CALENDAR_ICONS_PATH}/home.png`

const IS_DUE_LAYOUT_PATH = __dirname + '/../../../html/crm/task/layout_due.html'
const EVENT_LAYOUT_PATH = __dirname + '/../../../html/crm/task/layout_event.html'

const TYPE_ICONS = {
  'Call': CALENDAR_ICONS_PATH + '/task__call.svg',
  'In-Person Meeting': CALENDAR_ICONS_PATH + '/task__in-person-meeting.svg',
  'Text': CALENDAR_ICONS_PATH + '/task__text.svg',
  'Chat': CALENDAR_ICONS_PATH + '/task__chat.svg',
  'Mail': CALENDAR_ICONS_PATH + '/task__mail.svg',
  'Email': CALENDAR_ICONS_PATH + '/task__email.svg',
  'Open House': CALENDAR_ICONS_PATH + '/task__open-house.svg',
  'Tour': CALENDAR_ICONS_PATH + '/task__tour.svg',
  'Other': CALENDAR_ICONS_PATH + '/task__other.svg',
}

/**
 * Creates a Branch link for the task
 * @param {UUID} task_id Main task id
 * @param {UUID} user_id User receiving the notification
 * @param {string} email User's email
 */
async function getBranchLink(task_id, brand_id, user_id, email) {
  const url = Url.web({
    uri: '/branch'
  })

  return promisify(Branch.createURL)({
    action: BRANCH_ACTION,
    receiving_user: user_id,
    brand_id,
    email: email,
    crm_task: task_id,
    $desktop_url: url,
    $fallback_url: url
  })
}

function formatDate(timestamp, tz) {
  const m = moment(timestamp * 1000)

  if (moment.tz.zone(tz)) {
    m.tz(tz)
  }

  return m.format('MMM Do, YYYY, hh:mm A')
}

class TaskMailer extends Mailer {
  get subject() {
    return 'Reminder: ' + this.object.task.title
  }

  get to() {
    return this.object.user.email
  }

  get action() {
    const n = this.object.notification
    const t = this.object.task

    switch (n.action) {
      case 'Assigned':
        let action = 'You '

        if (t.assignees.length === 2) {
          action += 'and one other '
        }
        else if (t.assignees.length > 2) {
          action += `and ${t.assignees.length - 1} others `
        }

        action += 'have been assigned to an event'

        return action

      case 'Edited':
        return 'updated an event'

      default:
        return ''
    }
  }

  /**
   * Renders email html
   * @protected
   * @returns {Promise<string>}
   */
  async render() {
    const { user, task, notification } = this.object

    /** @type {string} */
    const link = await getBranchLink(task.id, task.brand, user.id, user.email)

    const associations = (task.associations || []).map(assoc => {
      switch (assoc.association_type) {
        case 'contact':
          return this.getContactArgs(assoc)
        case 'deal':
          return this.getDealArgs(assoc)
        case 'listing':
          return this.getListingArgs(assoc)
        default:
          break
      }
    })

    const LAYOUT_PATH = notification.action === 'IsDue' ? IS_DUE_LAYOUT_PATH : EVENT_LAYOUT_PATH

    const html = await promisify(render_template)(LAYOUT_PATH, {
      icon: TYPE_ICONS[task.task_type],
      timestamp: formatDate(task.updated_at),
      due_date: formatDate(task.due_date, user.timezone),
      action: this.action,
      link,
      user,
      task,
      notification,
      associations,
    })

    const data = Buffer.from(html, 'utf-8')
    this.attachment = {
      data,
      filename: 'rendered.html',
      contentType: 'text/html',
      knownLength: data.length
    }

    return juice(html)
  }

  getDealArgs(assoc) {
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
  }

  getListingArgs(assoc) {
    const { street_number, street_dir_prefix, street_name, street_suffix } = assoc.listing.property.address
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
  }

  getContactArgs(assoc) {
    const { email, phone_number, display_name, profile_image_url } = assoc.contact.summary
    return {
      icon: profile_image_url || DEFAULT_CONTACT_ICON,
      title: display_name,
      subtitle: [email, phone_number].filter(x => x && x.length).join(', ')
    }
  }
}

module.exports = TaskMailer
