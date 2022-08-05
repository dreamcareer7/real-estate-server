const Agent = require('../../lib/models/Agent')
const Task  = require('../../lib/models/Task')
const { Listing }   = require('../../lib/models/Listing')
const Notification  = require('../../lib/models/Notification')
const School = require('../../lib/models/School')
const EmailCampaign = require('../../lib/models/Email/campaign/due')
const SocialPost = require('../../lib/models/SocialPost/due')
const EmailCampaignStats = require('../../lib/models/Email/campaign/stats')
const GoogleCredential     = require('../../lib/models/Google/credential')
const MicrosoftCredential  = require('../../lib/models/Microsoft/credential')
const BrandTemplate = require('../../lib/models/Template/brand')
const BrokerWolf = require('../../lib/models/BrokerWolf')
const Message = require('../../lib/models/Message/email')
const Trigger = require('../../lib/models/Trigger/due')

const saveBrokerwolfSettings = (job, cb) => {
  BrokerWolf.Settings.save(job.data).nodeify(cb)
}

const syncBrokerwolfMembers = (job, cb) => {
  BrokerWolf.Members.sync(job.data.brand).nodeify(cb)
}

const syncBrokerwolfProperties = (job, cb) => {
  BrokerWolf.PropertyTypes.sync(job.data.brand).nodeify(cb)
}

const mapBrokerwolfProperty = (job, cb) => {
  BrokerWolf.PropertyTypes.map(job.data).nodeify(cb)
}

const syncBrokerwolfClassifications = (job, cb) => {
  BrokerWolf.Classifications.sync(job.data.brand).nodeify(cb)
}

const mapBrokerwolfClassification = (job, cb) => {
  BrokerWolf.Classifications.map(job.data).nodeify(cb)
}

const syncBrokerwolfContacts = (job, cb) => {
  BrokerWolf.Classifications.sync(job.data.brand).nodeify(cb)
}

const mapBrokerwolfContact = (job, cb) => {
  BrokerWolf.ContactTypes.map(job.data).nodeify(cb)
}

const sendTaskNotifications = (job, cb) => {
  Task.sendNotifications().nodeify(cb)
}

const refreshAgents = (job, cb) => {
  Agent.refreshContacts().nodeify(cb)
}

const sendDueEmailCampaigns = (job, cb) => {
  EmailCampaign.sendDue().nodeify(cb)
}

const sendDueSocialPost = (job, cb) => {
  SocialPost.sendDue().nodeify(cb)
}

const executedDueTriggers = (job, cb) => {
  Trigger.executeDue().nodeify(cb)
}

const updateEmailCampaginStats = (job, cb) => {
  EmailCampaignStats.updateStats().nodeify(cb)
}

const CreateGoogleCredential = (job, cb) => {
  GoogleCredential.create(job.data).nodeify(cb)
}

const CreateMicrosoftCredential = (job, cb) => {
  MicrosoftCredential.create(job.data).nodeify(cb)
}

const updateTemplateThumbnails = (job, cb) => {
  BrandTemplate.updateThumbnails().nodeify(cb)
}

const list = {
  socket_emit: (job, cb) => cb(),
  socket_join: (job, cb) => cb(),
  socket_user_status: (job, cb) => cb(),
  'Refresh.Subdivisions': Listing.refreshSubdivisions,
  'Refresh.Schools': School.refresh,
  'Refresh.Counties': Listing.refreshCounties,
  'Refresh.Areas': Listing.refreshAreas,
  'Refresh.Agents': refreshAgents,
  'Seamless.Email': Message.sendEmailForUnread,
  'Seamless.SMS': Notification.sendForUnread,
  'BrokerWolf.Settings.Save': saveBrokerwolfSettings,
  'BrokerWolf.Members.Sync': syncBrokerwolfMembers,
  'BrokerWolf.Classifications.Sync': syncBrokerwolfClassifications,
  'BrokerWolf.Classifications.map': mapBrokerwolfClassification,
  'BrokerWolf.PropertyTypes.Sync': syncBrokerwolfProperties,
  'BrokerWolf.PropertyTypes.map': mapBrokerwolfProperty,
  'BrokerWolf.ContactTypes.Sync': syncBrokerwolfContacts,
  'BrokerWolf.ContactTypes.map': mapBrokerwolfContact,
  'Task.sendNotifications': sendTaskNotifications,
  'EmailCampaign.sendDue': sendDueEmailCampaigns,
  'Trigger.executeDue': executedDueTriggers,
  'EmailCampaignStats.updateStats': updateEmailCampaginStats,
  'GoogleCredential.create': CreateGoogleCredential,
  'MicrosoftCredential.create': CreateMicrosoftCredential,
  'BrandTemplate.updateThumbnails': updateTemplateThumbnails,
  'SocialPost.sendDue': sendDueSocialPost,
}

const queues = {}

Object.keys(list).forEach(name => {
  const handler = (job, done) => {
    if (list[name].length === 1)
      list[name](done)
    else
      list[name](job, done)
  }

  queues[name] = {
    handler,
    parallel: 1
  }
})

module.exports = queues
