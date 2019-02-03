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
  },

  required: ['user', 'object_type', 'event_type', 'reminder']
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
   * @param {ICalendarGlobalNotificationSettingInput[]} settings
   * @param {UUID} user_id
   */
  async setGlobalSettings(settings, user_id, brand_id) {
    if (!Array.isArray(settings)) return []

    let ids

    if (settings.length > 0) {
      for (const ns of settings) {
        await validate({
          ...ns,
          brand: brand_id,
          user: user_id
        })
      }

      const q = sq.insert()
        .into('calendar_notification_settings')
        .setFieldsRows(settings.map(ns => ({
          ...ns,
          brand: brand_id,
          '"user"': user_id
        })))
        // @ts-ignore
        .onConflict(['"user"', 'object_type', 'event_type'], {
          reminder: sq.rstr('EXCLUDED.reminder'),
          updated_at: sq.rstr('NOW()'),
          deleted_at: null
        })
        .returning('id')

      // @ts-ignore
      q.name = 'calendar/notification/set'

      ids = await db.selectIds(q, [])
    }
    else {
      ids = []
    }

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
