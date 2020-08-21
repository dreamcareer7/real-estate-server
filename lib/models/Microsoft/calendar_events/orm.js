const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const publicize = async (model) => {
  delete model.change_key
  delete model.can_edit
  delete model.can_share
  delete model.can_view_private_items

  return model
}


Orm.register('microsoft_calendar', 'MicrosoftCalendarEvent', {
  getAll,
  publicize
})