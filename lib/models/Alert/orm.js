const Orm = require('../Orm/registry')
const { getAll } = require('./get')

Orm.register('alert', 'Alert', {
  getAll,
  associations: {
    users: {
      collection: true,
      model: 'User',
    },
  
    created_by: {
      optional: true,
      model: 'User'
    },
  
    mls_areas: {
      ids: (a, cb) => {
        if (!a.mls_areas)
          return cb()
  
        const areas = new Set()
  
        a.mls_areas.forEach(pair => {
          // [number, parent]
          areas.add(`[${pair[0]},${pair[1]}]`)
  
          if (pair[1] > 0) { // [number, 0]
            areas.add(`[${pair[1]},0]`)
          }
        })
  
        return cb(null, Array.from(areas))
      },
      model: 'MLSArea',
      collection: true
    },
  
    user_alert_setting: {
      model: 'UserAlertSetting',
      enabled: true,
    }
  }
})
