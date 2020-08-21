const mock_plan = require('./plan')

const customers = {}
const subscriptions = {}

let id = 0

const customer = {
  create: data => {
    id++
    const customer = {
      ...data,
      id: id.toString()
    }

    customers[id] = customer

    const request = async () => {
      return {
        customer
      }
    }

    return { request }
  },

  retrieve: id => {
    const request = async () => {
      const customer = customers[id]

      return { customer }
    }

    return { request }
  }
}

const subscription = {
  create_for_customer: (customer_id, data) => {
    id++

    const subscription = {
      ...data,
      status: 'in_trial',
      customer_id,
      id
    }

    subscriptions[id] = subscription

    const request = async () => {
      return {
        subscription
      }
    }

    return { request }
  },

  retrieve: id => {
    const request = async () => {
      const subscription = subscriptions[id]

      return { subscription }
    }

    return { request }
  },

  update: (id, data) => {
    const request = async () => {
      return {
        ...subscriptions[id],
        ...data
      }
    }

    return { request }
  },

  cancel: (id) => {
    const request = async () => {
      subscriptions[id].status = 'cancelled'
      return subscriptions[id]
    }

    return { request }
  }
}

const hosted_page = {
  checkout_existing: data => {
    const url = `https://mock-chargebee/${data.subscription.id}?embed=${Boolean(data.embed)}`

    const request = async () => {
      const hosted_page = {
        url
      }

      return { hosted_page }
    }

    return { request }
  }
}

const plan = {
  retrieve: id => {
    const request = async () => {
      return { plan: mock_plan }
    }

    return { request }
  }
}

module.exports = {
  configure: () => {},
  customer,
  subscription,
  hosted_page,
  plan
}
