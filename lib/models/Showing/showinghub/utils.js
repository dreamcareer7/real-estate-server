const isEmpty = require('lodash/isEmpty')
const isNil = require('lodash/isNil')
const uniq = require('lodash/uniq')
const some = require('lodash/some')

const Agent = require('../../Agent/get')
const Office = require('../../Office/get')

const {
  RequiredParticipants, ConfirmationType
} = require('./api')
const { client } = require('./client')

const Context = require('../../Context')
const Approval = require('../approval/get')

/** @typedef {import('../showing/types').Showing} RechatShowing */
/** @typedef {import('../role/types').ShowingRole} RechatShowingRole */
/** @typedef {import('../appointment/types').ShowingAppointment} RechatAppointment */
/** @typedef {import('./types').AppointmentStatus} HubAppointmentStatus */
/** @typedef {import('./types').WebhookEvent} WebhookEvent */
/** @typedef {import('./types').WebhookPayload} WebhookPayload */
/** @typedef {import('./types').ShowableListingRequest} ShowableListingRequest */
/** @typedef {(appId: string, payload: WebhookPayload) => Promise<void>} WebhookHandler */
/** @typedef {import('../availability/types').ShowingAvailability} RechatShowingAvailability */
/** @typedef {import('./api').ShowListingResult} ShowListingResult */
/** @typedef {import('./api').RequestResult} RequestResult */
/** @typedef {import('./types').CommonApiResult} CommonApiResult */
/** @typedef {import('./api').DateTimeRestrictions} DateTimeRestrictions */
/** @typedef {import('./api').DateTimeReoccurringRestrictions} DateTimeReoccurringRestrictions */

const utils = {
  /**
   * @param {undefined | number | string | Date} val
   * @returns {string | undefined}
   */
  dateTime (val) {
    if (isNil(val)) { return undefined }
    if (!(val instanceof Date)) { val = new Date(val) }
    if (isNaN(val.getTime())) { throw new Error(`Invalid date: ${val}`) }

    return val.toISOString()
  },

  /**
   * @param {RechatShowingRole[]} roles
   * @returns {RequiredParticipants}
   */
  hubRequiredParticipants (roles) {
    const RP = RequiredParticipants
    
    const hasSeller = some(roles, { role: 'SellerAgent' })
    const hasBuyer = some(roles, { role: 'BuyerAgent' })

    if (hasSeller && hasBuyer) { return RP.BothBuyingAndListingAgent }
    if (hasSeller) { return RP.ListingAgent }
    if (hasBuyer) { return RP.BuyingAgent }

    return RP.NoParticipants
  },

  /**
   * @param {RechatShowing} showing
   * @returns {ConfirmationType}
   */
  hubConfirmationType ({ approval_type: type, instructions }) {
    const CT = ConfirmationType
    
    if (type !== 'None') { return CT.ConfirmationRequired }
    if (instructions) { return CT.ShowingInstructionsOnly }

    return CT.AutoApprove
  },

  /**
   * @param {IAgent} a
   * @returns {string}
   */
  fullName (a) {
    return a.full_name || `${a.first_name} ${a.last_name}`.trim() 
  },

  /**
   * @template {{ created_at: number, updated_at: number }} M
   * @param {M[]} models
   * @returns {M[]}
   */
  newerFirst (models) {
    return models.sort((m1, m2) => {
      const t1 = Math.max(m1.created_at || 0, m1.updated_at || 0)
      const t2 = Math.max(m2.created_at || 0, m2.updated_at || 0)
      return t1 - t2      
    })
  },

  /**
   * @param {RechatAppointment} appt
   * @returns {Promise<string>}
   */
  async extractCancellationComment (appt) {
    const warn = () => Context.log(`Warning: Appointment ${appt.id} is not rejected!`)
    
    if (!appt?.approvals?.length) {
      warn()
      return ''
    }

    const approvals = await Approval.getAll(appt.approvals)
    const comments = utils.newerFirst(approvals.filter(a => !a.approved))
      .map(a => a.comment)
      .filter(Boolean)
    
    return comments[0] || ''
  },

  /**
   * @param {Date | string | number} dt
   * @returns {number}
   */
  getTime (dt) {
    if (!dt) { return 0 }
    if (!(dt instanceof Date)) { dt = new Date(dt) }

    const time = dt.getTime()
    if (!isNaN(time)) { return time }
   
    throw new Error(`Invalid date: ${dt}`)
  },

  /**
   * @param {CommonApiResult} res
   * @returns {boolean}
   */
  handleFailure (res) {
    if (res?.exceptions?.length) {
      let msg = res.exceptions
          .map(ex => typeof ex === 'string' ? ex : JSON.stringify(ex))
          .join(', ')
      if (res?.message) { msg = `${res.message} (${msg})` }

      throw new Error(msg)
    }

    if (!res?.isSuccessful) {
      throw new Error('API call failed but no messages provided by the server')
    }

    return true
  },

  async buyerAgentContactInfo ({ buyingAgentMlsId, buyingAgentName: nameInHub }) {
    const agents = await Agent.getByMLSID(buyingAgentMlsId)
    utils.newerFirst(agents)

    const promises = agents
      .filter(a => a.office_mlsid)
      .map(a => Office.getByMLS(a.office_mlsid))
    const offices = (await Promise.all(promises)).filter(Boolean)
    utils.newerFirst(offices)
    
    const agent = k => agents.find(a => !isEmpty(a[k]))?.[k]
    const office = k => offices.find(o => !isEmpty(o[k]))?.[k]
    
    const phone = agent('phone_number') || agent('phone_numbers')?.[0]
          || agent('work_phone') || office('phone') || office('other_phone')
          || agent('fax') || office('fax')

    const fname = agent('first_name') || nameInHub?.split?.(' ')[0] || ''
    const lname = agent('last_name')
          || nameInHub?.split?.(' ').slice(1).join(' ') || ''

    return {
      first_name: fname,
      last_name: lname,
      email: agent('email') || agent('emails')?.[0] || office('email') || '',
      phone_number: phone || '',
      company: office('long_name') || office('name') || '',
      address: office('address') || office('st_address') || '',
      tag: 'ShowingHub',
      office_mlsid: office('mls_id') || '',
      agent_mlsid: agent('mlsid') || '',

      // XXX: is it required?
      listing_number: '',
      lead_source_url: '',
      lead_subsource: '',
      lead_source: '',
      owner_id: '', 
      message: '',
      note: '',
    }
  },

  /**
   * @param {string} hubShowingId
   */
  async clearAllRestrictions (hubShowingId) {
    const res = await client.api.appListingGetDetail(hubShowingId)
    if (!utils.handleFailure(res.data)) { return }
    
    const hubShowing = res?.data?.results?.[0]
    if (!hubShowing) { return }

    const reoRestIds = uniq(
      hubShowing
        .dateTimeReoccurringRestrictionsList?.map?.(rr => rr.reoccurringId)
    )
    
    const restIds = uniq(
      hubShowing.dateTimeRestrictionsList?.map?.(r => r.restrictionId)
    )

    for (const rrid of reoRestIds) {
      if (!rrid) { continue }
      await client.api.appListingRemoveReoccurringRestrictionDelete(rrid)
    }

    for (const rid of restIds) {
      if (!rid) { continue }
      await client.api.appListingRemoveRestrictionDelete(rid)
    }
  },

  /**
   * @param {string} hubShowingId
   * @param {DateTimeRestrictions[]} rests
   */
  async putRestrictions (hubShowingId, rests) {
    for (const rest of rests) {
      await client.api.appListingCreateRestrictionCreate(hubShowingId, rest)      
    }
  },

  /**
   * @param {string} hubShowingId
   * @param {DateTimeReoccurringRestrictions[]} reoRests
   */
  async putReoccurringRestrictions (hubShowingId, reoRests) {
    for (const reoRest of reoRests) {
      await client.api.appListingCreateRestrictionCreate(hubShowingId, reoRest)
    }    
  },
  
}

module.exports = utils
