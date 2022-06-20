const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')

const {
  get
} = require('./get')

// \dT+ notification_object_class
const object_enum = [
  'Recommendation',
  'Listing',
  'Message',
  'Comment',
  'Room',
  'HotSheet',
  'Photo',
  'Video',
  'Document',
  'Tour',
  'Co-Shopper',
  'Price',
  'Status',
  'User',
  'Alert',
  'Invitation',
  'Contact',
  'Attachment',
  'OpenHouse',
  'Envelope',
  'EnvelopeRecipient',
  'Deal',
  'DealRole',
  'CrmTask',
  'Reminder',
  'ContactList',
  'DealContext',
  'ContactAttribute',
  'EmailCampaignEmail',
  'EmailCampaign',
  'ShowingAppointment',
  'ShowingRole',
]

// \dT+ notification_action
const action_enum = [
  'Liked',
  'Composed',
  'Edited',
  'Added',
  'Removed',
  'Posted',
  'Favorited',
  'Changed',
  'Created',
  'CreatedFor',
  'Shared',
  'Arrived',
  'Toured',
  'Accepted',
  'Declined',
  'Joined',
  'Left',
  'Archived',
  'Deleted',
  'Opened',
  'Closed',
  'Pinned',
  'Sent',
  'Invited',
  'BecameAvailable',
  'PriceDropped',
  'StatusChanged',
  'TourRequested',
  'IsDue',
  'Assigned',
  'Withdrew',
  'Attached',
  'Detached',
  'Available',
  'ReactedTo',
  'Reviewed',
  'Captured',
  'Canceled',
  'Rescheduled',
  'Rejected',
  'Confirmed',
  'GaveFeedbackFor',
]

const notification_app_enum = [
  'rechat',
  'showingapp',
]

// \dT+ notification_delivery_type
const notification_delivery_type_enum = [
  'email',
  'push',
  'sms',
]

const schema = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: action_enum,
      required: true
    },

    object_class: {
      type: 'string',
      enum: object_enum,
      required: true
    },

    subject_class: {
      type: 'string',
      enum: object_enum,
      required: true
    },

    message: {
      type: 'string',
      required: false
    },

    image_url: {
      type: 'string',
      required: false
    },

    notified_user: {
      type: 'string',
      uuid: true,
      required: false
    },

    object: {
      type: 'string',
      uuid: true,
      required: true
    },

    subject: {
      type: 'string',
      uuid: true,
      required: true
    },

    room: {
      type: 'string',
      uuid: true,
      required: false
    },

    auxiliary_object: {
      type: 'string',
      uuid: true,
      required: false
    },

    auxiliary_object_class: {
      type: 'string',
      enum: object_enum,
      required: false
    },

    auxiliary_subject: {
      type: 'string',
      uuid: true,
      required: false
    },

    auxiliary_subject_class: {
      type: 'string',
      enum: object_enum,
      required: false
    },

    recommendation: {
      type: 'string',
      uuid: true,
      required: false
    },

    title: {
      type: 'string',
      required: false
    },

    sound: {
      type: 'string',
      required: false
    },

    app: {
      type: 'string',
      enum: notification_app_enum,
      required: true,
    },

    transports: {
      type: 'array',
      items: {
        type: 'string',
        enum: notification_delivery_type_enum,
      },
      required: false,
      uniqueItems: true,
      minItems: 1,
    },

    phone_number: {
      type: 'string',
      minLength: 1,
      required: false,
    },
  }
}

const validate = validator.bind(null, schema)

/**
 * Actually create a notification record in DB
 * @param {INotification} notification Notification object to be created
 * @param {(err, notification: INotification) => void} cb Callback function that returns created notification
 */
function insert (notification, cb) {
  notification.app || (notification.app = 'rechat')
  
  validate(notification, err => {
    if (err)
      return cb(err)

    db.query('notification/insert', [
      notification.action,
      notification.object_class,
      notification.object,
      notification.subject,
      notification.message,
      notification.auxiliary_object_class,
      notification.auxiliary_object,
      notification.recommendation,
      notification.room,
      notification.auxiliary_subject,
      notification.subject_class,
      notification.auxiliary_subject_class,
      notification.extra_object_class,
      notification.extra_subject_class,
      notification.exclude,
      notification.specific,
      notification.title,
      notification.data,
      notification.sound,
      notification.app,
      notification.transports,
      notification.phone_number,
    ], function (err, res) {
      if (err)
        return cb(err)

      get(res.rows[0].id, (err, notification) => {
        if (err)
          return cb(err)

        cb(null, notification)
      })
    })
  })
}

module.exports = {
  insert
}
