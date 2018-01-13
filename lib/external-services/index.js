const MSGraphService = require('./ms-graph')

const MS_GRAPH_SERVICE_NAME = 'MSGraph'
const GOOGLE_SERVICE_NAME = 'Google'
const serviceList = [MS_GRAPH_SERVICE_NAME, GOOGLE_SERVICE_NAME]
const SERVICE_NOT_FOUND_ERROR_MESSAGE = 'The service is not supported.'

module.exports = {
  serviceFactory(serviceName, serviceOptions) {
    if (!serviceList.includes(serviceName)) {
      throw Error(SERVICE_NOT_FOUND_ERROR_MESSAGE)
    }

    switch (serviceName) {
      case MS_GRAPH_SERVICE_NAME:
        return new MSGraphService(serviceOptions)
      default:
        throw Error(SERVICE_NOT_FOUND_ERROR_MESSAGE)
    }
  },
  MS_GRAPH_SERVICE_NAME,
  GOOGLE_SERVICE_NAME
}