const { strict: assert } = require('assert')
const isEmpty = require('lodash/isEmpty')
const isNil = require('lodash/isNil')
const find = require('lodash/find')
const some = require('lodash/some')
const has = require('lodash/has')

const Orm = require('../../Orm/context')
const Context = require('../../Context')
const { client } = require('./client')
const config = require('../../../config')

const User = require('../../User/get')
const Agent = require('../../Agent/get')
const Approval = require('../approval/get')
const Showing = require('../showing/get')
const ShowingRole = require('../role/get')
const Availability = require('../availability/get')
const Appointment = {
  ...require('../appointment/get'),
  ...require('../appointment/create'),
}
const Office = require('../../Office/get')

const {
  RequiredParticipants, ConfirmationType, ShowingMethod, ShowingStatus,
  CancellationReasonType, AppointmentType, AppointmentMethod,
} = require('./api')

const niy = () => new Error('Not implemented yet')
const noop = msg => Context.log(`${msg}. Nothing here to do...`)
const any = x => x

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

const dao = {
  /**
   * @param {RechatShowing['id']} showingId
   * @returns {Promise<RechatShowing>}
   */
  async getShowing (showingId) {
    Orm.enableAssociation('showing.roles')
    return Showing.get(showingId)
  },

  /** 
   * @param {RechatAppointment['id']} apptId 
   * @returns {Promise<string>}
   */
  async findHubAppointmentId (apptId) {
    throw niy()
  },

  /** 
   * @param {RechatAppointment['id']} apptId 
   * @returns {Promise<string>}
   */
  async findRequestId (apptId) {
    throw niy()
  },
  
  /**
   * @param {RechatShowing['id']} showingId
   * @returns {Promise<string>}
   */
  async findHubShowingId (showingId) {
    throw niy()
  },

  /**
   * @param {string} hubApptId
   * @returns {Promise<RechatAppointment['id']>}
   */
  async findRechatAppointmentId (hubApptId) {
    throw niy()
  },

  /**
   * @param {string} requestId
   * @returns {Promise<RechatAppointment['id']>}
   */
  async findRechatAppointmentIdByRequestId (requestId) {
    throw niy()
  },

  /**
   * @param {string} hubShowingId
   * @returns {Promise<RechatShowing['id']>}
   */
  async findRechatShowingId (hubShowingId) {
    throw niy()
  },

  /**
   * @param {RechatShowing['id']} showingId
   * @param {string} hubShowingId
   */
  async relateToHubShowing (showingId, hubShowingId) {
    throw niy()
  },

  /**
   * @param {RechatShowing['id']} apptId
   * @param {string} requestId
   */
  async relateToRequest (apptId, requestId) {
    throw niy()
  },
}

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

  /** @param {RechatShowingAvailability[]} avails */
  hubRestrictions (avails) {
    // TODO: implement it!
    return {
      dateTimeRestrictionsList: [],
      dateTimeReoccurringRestrictionsList: [],
    }
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
      let msg = res.exceptions.join(', ')
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
  }
}

const emit = {
  /** @param {RechatShowing['id']} showingId */
  async showingCreated (showingId) {
    const showing = await dao.getShowing(showingId)
    if (!showing) { return }

    /** @type {(k: keyof StdAddr) => string} */
    const addr = k => showing.address?.[k] ?? ''

    const roles = await ShowingRole.getAll(showing.roles)
    const seller = find(roles, { role: 'SellerAgent' })
    assert(seller, `No Seller Role found for showing ${showingId}`)
    const user = await User.get(seller.user_id)
    assert(user, `User not found for showing role ${seller.id}`)
    const sellerAgent = await Agent.get(user.agent)
    assert(sellerAgent, `Seller agent not found for showing ${showingId}`)
    /** @type {RechatShowingAvailability[]} */
    const avails = await Availability.getAll(showing.availabilities)

    /** @type {ShowListingResult} */
    const res = any(await client.api.appListingConfigureshowablelistingCreate({
      // FIXME: What if property info is entered manually?
      listingId: showing.listing || null,
      universalPropertyId: '',

      applicationId: config.showinghub.showingapp_id,
      
      address1: addr('line1'),
      address2: addr('line2'),
      city: addr('city'),
      state: addr('state'),
      zipCode: addr('postalcode'),
      
      listAgentMlsId: sellerAgent.mlsid,
      listAgentName: utils.fullName(sellerAgent),
      listAgentLicenseNumber: sellerAgent.license_number || '-',
      // listAgentLicenseStateAffirmation: true,
      // listingAgentLicenseState: '',
      
      showableStartDate: utils.dateTime(showing.start_date),
      showableEndDate: utils.dateTime(showing.end_date),
      showingInstructions: showing.instructions,

      // comments: '',
      requiredParticipants: utils.hubRequiredParticipants(roles),
      showingMethod: ShowingMethod.InPersonOnly,
      confirmationType: utils.hubConfirmationType(showing),
      showingAllowed: ShowingStatus.Showable,

      ...utils.hubRestrictions(avails),
    }))

    if (!utils.handleFailure(res)) { return }

    const hubShowing = res?.results?.[0]
    assert(hubShowing?.showListingId, 'No Hub Showing returned after creating ${showingId}')

    await dao.relateToHubShowing(showingId, hubShowing.showListingId)
  },

  /** @param {RechatShowing['id']} showingId */
  async showingUpdated (showingId) {
    throw niy()
  },

  /** @param {RechatAppointment['id']} apptId */
  async appointmentConfirmed (apptId) {
    const hubApptId = await dao.findHubAppointmentId(apptId)
    assert(hubApptId, `No Hub Appointment found for Rechat Appointment ${apptId}`)

    return client.api.appAppointmentConfirmUpdate(hubApptId)
  },

  /** @param {RechatAppointment['id']} apptId */
  async appointmentRequested (apptId) {
    const hubApptId = await dao.findHubAppointmentId(apptId)
    if (hubApptId) {
      Context.log(`Warning: Already there is related Hub Appointment (${hubApptId}) fornewly requested Rechat Appointment (${apptId})`)
    }

    const appt = await Appointment.get(apptId)
    if (!appt) { return }
    
    const showing = await dao.getShowing(appt.showing)
    if (!showing) { return }

    const hubShowingId = await dao.findHubShowingId(showing.id)
    assert(hubShowingId, `Related Hub Showing not found for showing ${showing.id}`)

    const startDt = utils.dateTime(appt.time)
    assert(startDt, `Cannot format start datetime for appointment ${apptId}`)

    const dur = showing.duration
    const endDt = utils.dateTime(utils.getTime(appt.time) + dur * 1000)
    assert(endDt, `Cannot format end datetime for appointment ${apptId}`)

    const roles = await ShowingRole.getAll(showing.roles)
    const buyer = find(roles, { role: 'BuyerAgent' })
    const user = buyer ? await User.get(buyer.user_id) : null
    const buyerAgent = user ? await Agent.get(user.agent) : null

    /** @type {RequestResult} */
    const res = any(await client.api.appRequestCreate({
      startDatetime: startDt,
      endDatetime: endDt,
      appointmentType: AppointmentType.FirstShowing,
      appointmentMethod: AppointmentMethod.InPersonOnly,

      buyingAgentID: buyerAgent?.id ?? '-',
      buyingAgentName: buyerAgent ? utils.fullName(buyerAgent) : '-',
      buyingAgentLicenseNumber: buyerAgent?.license_number ?? '-',
      buyingAgentLicenseState: '-',
      buyingAgentMlsId: buyerAgent?.mlsid ?? '-',
      buyingAgentStateLicenseAffirmation: true,

      requestNotes: '',
      
      showListingId: hubShowingId,
    }))

    // XXX: do we need to create an appointment here?

    if (!utils.handleFailure(res)) { return }

    const request = res?.results?.[0]
    assert(request?.requestId, `No Request [ID] returned after creating request for appointment ${apptId}`)

    await dao.relateToRequest(apptId, request.requestId)
  },

  /** @param {RechatAppointment['id']} apptId */
  async appointmentDenied (apptId) {
    const hubApptId = await dao.findHubAppointmentId(apptId)
    if (!hubApptId) {
      return Context.log(`No Hub Appointment found for Rechat Appointment ${apptId}`)
    }

    const appt = await Appointment.get(apptId)

    return client.api.appAppointmentDenyUpdate(hubApptId, {
      appointmentNotes: await utils.extractCancellationComment(appt),
    })
  },

  /** 
   * @param {RechatAppointment['id']} apptId
   * @param {CancellationReasonType=} [reason=CancellationReasonType.Other]
   */
  async appointmentCancelled (apptId, reason = CancellationReasonType.Other) {
    const hubApptId = await dao.findHubAppointmentId(apptId)
    if (!hubApptId) {
      return Context.log(`No Hub Appointment found for Rechat Appointment ${apptId}`)
    }

    const appt = await Appointment.get(apptId)

    return client.api.appAppointmentCancelUpdate(hubApptId, {
      cancelReason: reason,
      cancelComments: await utils.extractCancellationComment(appt),
    })
  },

  /** @param {RechatAppointment['id']} apptId */
  async appointmentRescheduled (apptId) {    
    await emit.appointmentCancelled(apptId, CancellationReasonType.Reschedule)
    await emit.appointmentRequested(apptId)
  },
}

const webhook = (function () {
  /** @type {Record<WebhookEvent, WebhookHandler>} */
  const handlers = {
    async ApplicationCreated (appId, payload) {
      noop('Appliction created')
    },
    
    async ShowListingCreated (appId, payload) {
      noop('Show[able] Listing created')
    },
    
    async ShowListingChanged (appId, payload) {
      noop('Show[able] Listing changed')
    },
    
    async ApplicationChanged (appId, payload) {
      noop('Application changed')
    },

    async AppointmentRequested (_, { data }) {
      if (!Array.isArray(data?.appointments) || !data.appointments.length) {
        return
      }

      const hubShowingId = data?.showListingId
      if (hubShowingId) { throw Error.Validation('Missing Show Listing ID') }

      const showingId = await dao.findRechatShowingId(hubShowingId)
      assert(showingId, `No related showing found for Hub Showing ${hubShowingId}`)

      for (const ha of data.appointments) {
        const contact = await utils.buyerAgentContactInfo(ha)
        const dt = ha.actualStartDatetime
              || data.actualStartDatetime
              || data.startDatetime

        const isoDate = new Date(dt).toISOString()

        await Appointment.request(showingId, {
          source: 'ShowingHub',
          time: isoDate,
          contact,
        })

        // TODO: handle auto-approve
        // TODO: persist ShowingHub-related model(s)
      }
    },

    async AppointmentConfirmed (_, { data }) {
      let apptId = await dao.findRechatAppointmentId(data.id)

      if (!apptId) {
        apptId = await dao.findRechatAppointmentIdByRequestId(data.requestId)
      }

      if (!apptId) {
        return Context.log(`No related appointment found for Hub Appointment ${data.id}`)
      }

      // TODO: Confirm the appointment
    },
  }

  /** @type {WebhookHandler} */
  async function handle (appId, payload) {
    const event = payload?.webhookEvent ?? null

    if (!appId && payload.applicationId) {
      appId = payload.applicationId
    }
    
    if (!event) {
      return Context.log(`Missing webhook event: ${JSON.stringify(payload)}`)
    } else if (!has(handlers, event)) {
      return Context.log(`No handler found for webhook event: ${event}`)
    }

    return handlers[event](appId, payload)
  }

  return { handle, handlers }
})()

module.exports = { emit, webhook }
