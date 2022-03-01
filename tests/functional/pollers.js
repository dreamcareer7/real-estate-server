const EmailCampaign = require('../../lib/models/Email/campaign/due')
const EmailCampaignStats = require('../../lib/models/Email/campaign/stats')
const ShowingAppointment = require('../../lib/models/Showing/appointment/poller')
const SocialPost = require('../../lib/models/SocialPost/due')

const pollers = {
  'EmailCampaign.sendDue': EmailCampaign.sendDue,
  'EmailCampaign.updateStats': EmailCampaignStats.updateStats,
  'Showing.appointment.finalizeRecentlyDone': ShowingAppointment.finalizeRecentlyDone,
  'Showing.appointment.sendEmailNotification': ShowingAppointment.sendEmailNotification,
  'SocialPost.sendDue': SocialPost.sendDue,
}

module.exports = pollers
