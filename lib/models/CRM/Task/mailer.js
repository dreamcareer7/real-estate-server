const path = require('path')
const moment = require('moment-timezone')
const juice = require('juice')
const snake = require('to-snake-case')

const promisify = require('../../../utils/promisify')
const Mailer = require('../../../utils/mailer')

const Branch = require('../../Branch')
const Listing = require('../../Listing/format')
const Url = require('../../Url')
const render_template = require('../../../utils/render').html

const BRANCH_ACTION = 'RedirectToCRMTask'

const CALENDAR_ICONS_PATH = 'https://assets.rechat.com/mail/crm/events'
const DEFAULT_DEAL_ICON = `${CALENDAR_ICONS_PATH}/home.png`
const DEFAULT_LISTING_ICON = `${CALENDAR_ICONS_PATH}/home.png`

const TYPE_ICONS = {
  'Call': `${CALENDAR_ICONS_PATH}/task__call.png`,
  'In-Person Meeting': `${CALENDAR_ICONS_PATH}/task__in-person-meeting.png`,
  'Text': `${CALENDAR_ICONS_PATH}/task__text.png`,
  'Chat': `${CALENDAR_ICONS_PATH}/task__chat.png`,
  'Mail': `${CALENDAR_ICONS_PATH}/task__mail.png`,
  'Email': `${CALENDAR_ICONS_PATH}/task__email.png`,
  'Open House': `${CALENDAR_ICONS_PATH}/task__open-house.png`,
  'Tour': `${CALENDAR_ICONS_PATH}/task__tour.png`,
  'Showing': `${CALENDAR_ICONS_PATH}/task__showing.png`,
  'Other': `${CALENDAR_ICONS_PATH}/task__other.png`
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

  return Branch.createURL({
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
    /** @type {INotification} */
    const n = this.object.notification

    if (n.action === 'Assigned' && n.auxiliary_subject) {
      return n.auxiliary_subject.display_name
    }
    if (n.action === 'Edited') {
      return 'Updated Event'
    }
    if (n.action === 'IsDue') {
      return 'Upcoming Rechat Event'
    }

    return 'Rechat Reminder'
  }

  get to() {
    return [ this.object.user.email ]
  }

  get action() {
    const n = this.object.notification
    const t = this.object.task

    switch (n.action) {
      case 'Assigned':
        let action = 'You '

        if (t.assignees) {
          if (t.assignees.length === 2) {
            action += 'and one other '
          }
          else if (t.assignees.length > 2) {
            action += `and ${t.assignees.length - 1} others `
          }
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

    const assignees = (task.assignees || []).map(asn => ({
      has_picture: asn.profile_image_url && asn.profile_image_url.length > 0,
      picture: asn.profile_image_url,
      name: asn.display_name,
      email: asn.email
    }))

    const LAYOUT_PATH = path.resolve(
      __dirname,
      '../../../html/crm/task',
      snake(notification.action) + '.html'
    )

    const html = await promisify(render_template)(LAYOUT_PATH, {
      icon: TYPE_ICONS[task.task_type],
      timestamp: formatDate(task.updated_at),
      due_date: formatDate(task.due_date, user.timezone),
      action: this.action,
      unsafe_description: task.description && task.description.trim().startsWith('<'),
      link,
      user,
      task: {
        ...task,
        task_type: task.task_type === 'Other' ? 'Event' : task.task_type
      },
      notification,
      associations,
      assignees,
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
    if (assoc.deal.context) {
      const { photo, street_address } = assoc.deal.context

      return {
        has_picture: true,
        icon: photo ? photo.text : DEFAULT_DEAL_ICON,
        title: street_address ? street_address.text : '',
        subtitle: `${assoc.deal.deal_type} Deal`
      }
    }

    return {
      has_picture: true,
      icon: DEFAULT_DEAL_ICON,
      title: 'Deal',
      subtitle: `${assoc.deal.deal_type} Deal`
    }
  }

  getListingArgs(assoc) {
    const {
      street_number,
      street_dir_prefix,
      street_name,
      street_suffix,
      street_dir_suffix
    } = assoc.listing.property.address
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
      has_picture: true,
      icon: assoc.listing.cover_image_url || DEFAULT_LISTING_ICON,
      title: [
        street_number,
        street_dir_prefix,
        street_name,
        street_suffix,
        street_dir_suffix
      ].filter(Boolean).join(' '),
      subtitle: subtitle_parts.join(', ')
    }
  }

  /**
   * @param {{ contact: IContact }} assoc 
   */
  getContactArgs(assoc) {
    const { email, phone_number, display_name, profile_image_url } = assoc.contact
    return {
      has_picture: profile_image_url && profile_image_url.length > 0,
      icon: profile_image_url,
      title: display_name,
      subtitle: [email, phone_number].filter(x => x && x.length).join(', ')
    }
  }
}

module.exports = TaskMailer
