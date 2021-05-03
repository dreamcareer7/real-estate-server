const Orm = require('../../Orm/registry')
const { getAll } = require('./get')

Orm.register('showing_appointment_notification', 'ShowingAppointmentNotification', {
  getAll,
  associations: {
    subjects: {
      collection: true,
      model: (n, cb) => cb(null, n.subject_class),
      ids: (n, cb) => {
        if (n.subject) return cb(null, [n.subject])

        return cb()
      },
    },
  },
})
