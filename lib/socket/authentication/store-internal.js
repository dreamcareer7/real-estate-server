const users = {}
const workers = {}

const add = item => {
  const { user, socket, worker } = item

  if (!users[user])
    users[user] = {}

  if (!workers[worker])
    workers[worker] = {}

  users[user][socket] = item
  workers[worker][socket] = item
}

const remove = ({user, socket}) => {
  if (!users[user])
    return

  if (!users[user][socket])
    return

  const item = users[user][socket]

  delete users[user][socket]

  if (Object.keys(users[user]).length < 1)
    delete users[user]

  delete workers[item.worker][socket]

  if (Object.keys(workers[item.worker]).length < 1)
    delete workers[item.worker]
}

const isOnline = user => {
  return (users[user] && (Object.keys(users[user]).length > 0))
}

const byWorker = worker => workers[worker]

const getWorkers = () => Object.keys(workers)

const getAll = () => {
  return Object.keys(users)
}
module.exports = {
  add,
  remove,
  isOnline,
  byWorker,
  getWorkers,
  getAll
}