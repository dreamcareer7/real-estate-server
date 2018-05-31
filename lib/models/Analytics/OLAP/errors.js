class AnalyticsBaseError extends Error {
  constructor(message) {
    super(message)
    this.skip_trace_log = true
    this.skip_sentry = true
  }
}

class BadFilter extends AnalyticsBaseError {}
class UndefinedDimension extends AnalyticsBaseError {
  constructor(dim_name) {
    super(`Dimension ${dim_name} is undefined.`)
  }
}
class UndefinedLevel extends AnalyticsBaseError {
  constructor(dim_name, level) {
    super(`Level ${level} is not defined for dimension ${dim_name}.`)
  }
}

module.exports = {
  BadFilter,
  UndefinedDimension,
  UndefinedLevel
}
