const EmailCampaign = require('../../lib/models/Email/campaign/due')
const ShowingAppointment = require('../../lib/models/Showing/appointment/poller')

const pollers = {
  'EmailCampaign.sendDue': EmailCampaign.sendDue,
  'Showing.appointment.finalizeRecentlyDone': ShowingAppointment.finalizeRecentlyDone,
}

module.exports = pollers
