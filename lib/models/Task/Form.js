const status = {}

status.New = 'New'
status.Review = 'InProgress'

const getState = task => {
  if (task.review)
    return status.Review

  return status.New
}

const evaluate = async task => {
  const populated = (await Orm.populate({
    models: [task]
  }))[0]

  const state = getState(populated)

  task.status = state

  return Task._update(task)
}

module.exports = {
  evaluate
}