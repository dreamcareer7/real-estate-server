const _ = require('lodash')
const sq = require('@rechat/squel').useFlavour('postgres')

const db = require('../../utils/db')
const Orm = require('../Orm')
const CrmTask = require('../CRM/Task/index')

const BrandEvent = require('../Brand/event')

class FlowEvent {
  /**
   * @param {UUID} brand_id
   * @param {UUID} user_id
   * @param {UUID[]} brand_event_ids
   * @param {IFlowEventInput[]} events
   */
  async create(brand_id, user_id, brand_event_ids, events) {
    Context.log(`Creating ${events.length} events`)
    if (events.length < 1) return []

    const brand_events = await BrandEvent.getAll(brand_event_ids)
    const be_by_id = _.keyBy(brand_events, 'id')

    const crm_tasks = events.map(/** @returns {ITaskInput} */e => ({
      title: be_by_id[e.origin].title,
      due_date: e.due_date,
      task_type: be_by_id[e.origin].task_type,
      status: 'PENDING',
      assignees: [user_id],
      associations: [{
        association_type: 'contact',
        contact: e.contact
      }]
    }))

    const crm_task_ids = await CrmTask.createMany(crm_tasks, user_id, brand_id)

    const data = events.map((event, i) => ({
      crm_task: crm_task_ids[i],
      origin: event.origin,
      created_by: user_id
    }))

    const q = sq.insert({ autoQuoteFieldNames: true })
      .into('flows_events')
      .setFieldsRows(data)
      .returning('id')

    q.name = 'flow/event/create'

    return db.selectIds(q, [])
  }
}

const Model = new FlowEvent

Orm.register('flow_event', 'FlowEvent', Model)

module.exports = Model
