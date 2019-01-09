const db = require('../../utils/db')
const sq = require('../../utils/squel_extensions')
const validator = require('../../utils/validator')

const Orm = require('../Orm')

const schema = {
  type: 'object',
  properties: {
    user: {
      type: 'string',
      uuid: true,
      required: true
    },
    object_type: {
      type: 'string',
      enum: [
        'contact_attribute',
        'deal_context'
      ],
      required: true
    },
    event_type: {
      type: 'string',
      required: true
    },
    reminder: {
      type: 'number',
      required: true
    }
  }
}

const validate = validator.promise.bind(null, schema)

class CalendarNotificationSettings {
  /**
   * @returns {Promise<ICalendarGlobalNotificationSetting[]>}
   */
  async getGlobalSettings(user_id) {
    return db.select('calendar/notification/get_global', [
      user_id
    ])
  }

  /**
   * @param {ICalendarGlobalNotificationSetting[]} settings
   * @param {UUID} user_id
   */
  async setGlobalSettings(settings, user_id) {
    if (!Array.isArray(settings)) return []

    for (const ns of settings) {
      await validate(ns)
    }

    const q = sq.insert()
      .into('calendar_notification_settings')
      .setFieldsRows(settings)
      // @ts-ignore
      .onConflict(['object_type', 'event_type'], {
        reminder: sq.rstr('EXCLUDED.reminder'),
        updated_at: sq.rstr('NOW()'),
        deleted_at: null
      })
      .returning('id')

    // @ts-ignore
    q.name = 'calendar/notification/set'

    const ids = await db.update(q, [])

    await db.update('calendar/notification/clean_global', [
      user_id,
      ids
    ])

    return ids
  }
}

const Model = new CalendarNotificationSettings
Orm.register('calendar_notification_setting', 'CalendarNotificationSetting', Model)

module.exports = Model
