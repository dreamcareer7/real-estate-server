const _ = require('lodash')

const config    = require('../../config')
const redis     = require('../../data-service/redis').createClient()
const promisify = require('../../utils/promisify')

const Review       = require('../Review')

const { issueForUsers }          = require('../Notification/issue')
const { getStreetAddress }       = require('../Deal/context/get')
const { getAll: getAllDeals }    = require('../Deal/get')
const { notifyById }             = require('../Deal/live')
const { getUsers: getRoomUsers } = require('../Room/users/get')

const { getAll } = require('./get')

const zrangebyscore = promisify(redis.zrangebyscore.bind(redis))
const zrem          = promisify(redis.zrem.bind(redis))
const del           = promisify(redis.del.bind(redis))
const zrange        = promisify(redis.zrange.bind(redis))

const { AGENTS } = require('./constants')

const sendNotifications = async (delay = config.task_notification_delay) => {
  const until = Date.now() - delay

  const deal_ids = await zrangebyscore('deal-notifications', 0, until)

  if (deal_ids.length < 1) {
    return
  }

  const deals = await promisify(getAllDeals)(deal_ids)

  for(const deal of deals) {
    await sendDealNotification(deal)
  }
}

const sendDealNotification = async deal => {
  const task_ids = await zrange(`deal-notifications-${deal.id}`, 0, -1)

  if (task_ids.length < 1) {
    return
  }

  const tasks = await getAll(task_ids)

  const review_ids = tasks.map(t => t.review)
  const reviews = await Review.getAll(review_ids)

  const tasks_by_review = _.keyBy(tasks, 'review')

  const counts = {}
  counts[Review.INCOMPLETE] = []
  counts[Review.SUBMITTED] = []
  counts[Review.DECLINED] = []
  counts[Review.APPROVED] = []

  for(const review of reviews) {
    const task = tasks_by_review[review.id]
    if (!task.acl.includes(AGENTS))
      continue

    counts[review.status].push(task.title)
  }

  /*
   * We may have X tasks to notify.
   * But then they may all be private.
   * So the notification will be empty.
   * This prevents that.
   *
   * We can also put the acl logic in the Task/upsert
   * But that means if you make a change, then make the task private, it would still
   * send notifications to agents, which would be a loophole.
   * https://gitlab.com/rechat/web/-/issues/6326#note_903000820
   */

  if (counts[Review.INCOMPLETE] < 1 && counts[Review.SUBMITTED] < 1 && counts[Review.DECLINED] < 1 && counts[Review.APPROVED] < 1)
    return

  const notification = {}
  notification.subject_class = 'Deal'
  notification.object_class  = 'Deal'
  notification.subject = deal.id
  notification.action  = 'Reviewed'
  notification.object  = deal.id
  notification.title   = getStreetAddress(deal)
  notification.data    = counts
  notification.message = ''

  const user_ids = await getUsersToNotify(tasks)

  await promisify(issueForUsers)(notification, user_ids, {})

  await zrem('deal-notifications', deal.id)
  await del(`deal-notifications-${deal.id}`)

  await notifyById(deal.id)
}

const getUsersToNotify = async tasks => {
  const room_ids = tasks.map(t => t.room)
  const users = await getRoomUsers(room_ids)

  return _.chain(users)
    .filter({
      notification_setting: 'N_ALL'
    })
    .map('user')
    .uniq()
    .value()
}

module.exports = {
  sendNotifications,
}
