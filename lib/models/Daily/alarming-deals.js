const Deal = require('../Deal/filter')

const DealChecklist = require('../Deal/checklist/get')
const Task = require('../Task/get')
const Review = require('../Review')

const { chain, keyBy } = require('lodash')

const moment = require('moment')

const getAlarmingDeals = async user => {
  const from = moment.utc().startOf('day')
  const to = moment.utc().startOf('day').add(14, 'days')

  const closings = await Deal.filter({
    user,
    filter: {
      contexts:{
      	closing_date: {
      		date:{ from, to }
      	}
      },
      role: {
        user: [user.id]
      },
      $order: ['deals.created_by', 'DESC'],
    }
  })

  const checklist_ids = chain(closings).map('checklists').flatten().value()
  const checklists = await DealChecklist.getAll(checklist_ids)
  const indexed_checklists = keyBy(checklists, 'id')

  const task_ids = chain(checklists).map('tasks').flatten().value()
  const tasks = await Task.getAll(task_ids)
  const indexed_tasks = keyBy(tasks, 'id')

  const review_ids = chain(tasks).map('review').filter(Boolean).value()
  const reviews = await Review.getAll(review_ids)
  const indexed_reviews = keyBy(reviews, 'id')

  const setAlarm = deal => {
    deal.declined = 0
    deal.required = 0

    const tasks = chain(deal.checklists)
      .map(checklist_id => indexed_checklists[checklist_id])
      .map('tasks')
      .flatten()
      .map(task_id => indexed_tasks[task_id])
      .value()

    tasks.forEach(task => {
      const review = indexed_reviews[task.review]

      if (review?.status === Review.DECLINED) {
        deal.declined++
        return
      }

      if (!task.required && review?.status !== Review.SUBMITTED)
        return

      deal.required++
    })
  }

  closings.forEach(setAlarm)
  return closings.filter(d => !d.faired_at || d.declined || d.required)
}

module.exports = { getAlarmingDeals }