const db = require('../../../utils/db')
const Context = require('../../Context')


/**
 * @param {UUID} user_id
 * @param {UUID} brand_id
 * @param {IBrandEventInput[]} events 
 */
const createAll = async (user_id, brand_id, events) => {
  return db.selectIds('brand/event/create', [
    user_id,
    brand_id,
    JSON.stringify(events),
    Context.getId()
  ])
}

/**
 * @param {UUID} user_id 
 * @param {UUID} event_id 
 * @param {IBrandEventInput} event 
 */
const update = async (user_id, event_id, event) => {
  return db.update('brand/event/update', [
    user_id,
    Context.getId(),
    event_id,
    event.task_type,
    event.title,
    event.description
  ])
}

/**
 * @param {UUID} user_id 
 * @param {UUID[]} events
 */
const deleteByUser = async (user_id, events) => {
  return db.update('brand/event/delete', [
    user_id,
    Context.getId(),
    events,
  ])
}


module.exports = {
  createAll,
  update,
  delete: deleteByUser
}