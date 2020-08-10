const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const publicize = async (model) => {
  delete model.iCalUID
  delete model.transparency
  delete model.visibility
  delete model.hangoutLink
  delete model.htmlLink
  delete model.sequence
  delete model.anyoneCanAddSelf
  delete model.guestsCanInviteOthers
  delete model.guestsCanModify
  delete model.guestsCanSeeOtherGuests
  delete model.attendeesOmitted
  delete model.locked
  delete model.privateCopy
  delete model.creator
  delete model.organizer
  delete model.attachments
  delete model.conferenceData
  delete model.gadget
  delete model.source
  delete model.originalStartTime

  return model
}


Orm.register('google_calendar_events', 'GoogleCalendarEvent', {
  getAll,
  publicize
})