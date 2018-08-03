const squel = require('squel').useFlavour('postgres')

const db = require('../../../utils/db')
const { isIterable } = require('../../../utils/belt')

// eslint-disable-next-line
const CubeBase = require('./cube')
const { BadFilter, UndefinedDimension, UndefinedLevel } = require('./errors')

class QueryBuilder {
  /**
   * @param {CubeBase} cube 
   * @param {any[]=} drilldowns 
   * @param {any[]=} filters 
   * @param {UUID=} user_id
   */
  constructor(cube, drilldowns, filters, user_id, brand_id) {
    /** @type {CubeBase} */
    this.cube = cube

    /** @type {any[]} */
    this.filters = []

    /** @type {any[]} */
    this.drilldowns = []

    this.user_id = user_id
    this.brand_id = brand_id

    if (drilldowns && isIterable(drilldowns)) {
      for (const dd of drilldowns) {
        this.addDrilldown(dd)
      }
    }

    if (filters && isIterable(filters)) {
      for (const f of filters) {
        this.addFilter(f)
      }
    }
  }

  async aggregate() {
    this.q = squel.select()

    this
      ._addFrom()
      ._addSelectFields()
      ._addWhere()
      ._addGroupBy()

    this.q.name = 'analytics/' + this.cube.name + '/aggregates'
    return db.select(this.q)
  }

  /**
   * Fetches fact records
   * @param {PaginationOptions & { fields?: string[] }} options 
   */
  async facts(options = {}) {
    this.q = squel.select()

    this._addFrom()
    if (Array.isArray(options.fields)) {
      for (const f of options.fields) {
        this.q.field(f)
      }
    }
    else {
      this.q.field('*')
    }

    this._addWhere()

    if (options.order) {
      if ('+-'.indexOf(options.order[0]) > -1)
        this.q.order(options.order.substring(1), options.order[0] !== '-')
      else
        this.q.order(options.order)
    }

    if (options.start) this.q.offset(options.start)
    if (options.limit) this.q.limit(options.limit)

    this.q.name = 'analytics/' + this.cube.name + '/facts'
    return db.select(this.q)
  }

  /**
   * @param {CubeBase} cube
   */
  set cube(cube) {
    this._cube = cube
  }

  /**
   * @returns {CubeBase}
   */
  get cube() {
    return this._cube
  }

  addDrilldown(drilldown) {
    this.drilldowns.push(drilldown)
  }

  addFilter(filter) {
    const value_formatter = f => (f.dimension.type === 'date') ? 'to_timestamp(?)' : '?'

    const f = {...filter}
  
    const [dim, level] = f.key.split('.')
    f.dimension = this.cube.dimensions[dim]
    if (!f.dimension) {
      throw new UndefinedDimension(dim)
    }

    if (level) {
      f.level = (f.dimension.levels || []).find(lvl => lvl.name === level)
      if (!f.level) {
        throw new UndefinedLevel(dim, level)
      }
    }

    const formatted_field = value_formatter(f)

    switch (f.type) {
      case 'point':
        if (f.point === null) {
          f.query = {
            field: f.key.replace('.', '_'),
            operator: f.invert ? 'IS NOT' : 'IS',
            value: 'NULL'
          }
        }
        else {
          f.query = {
            field: f.key.replace('.', '_'),
            operator: f.invert ? '<>' : '=',
            value: formatted_field
          }
        }

        break
      case 'set':
        if (f.dimension.type === 'date')
          throw new BadFilter('Set filters are not yet supported for date dimensions.')

        f.query = {
          field: f.key.replace('.', '_'),
          operator: f.invert ? '<>' : '=',
          value: (f.invert ? 'ALL' : 'ANY') + `(ARRAY[${f.set.map(_ => '?').join(', ')}]::${f.dimension.data_type}[])`
        }
        break
      case 'range':
        f.query = {
          field: f.key.replace('.', '_')
        }
        if (f.low !== undefined && f.high !== undefined) {
          f.query.operator = f.invert ? 'NOT BETWEEN' : 'BETWEEN'
          f.query.value = formatted_field + ' AND ' + formatted_field
        }
        else if (f.low !== undefined) {
          f.query.operator = f.invert ? '<' : '>='
          f.query.value = formatted_field
        }
        else if (f.high !== undefined) {
          f.query.operator = f.invert ? '>' : '<='
          f.query.value = formatted_field
        }
        else {
          return
        }

        break
      default:
        break
    }

    this.filters.push(f)
  }

  _getDrilldownFields(drilldown_key) {
    if (drilldown_key.indexOf('.') < 1)
      return [drilldown_key]
    
    const [dim_name, level] = drilldown_key.split('.')
    const dd_fields = []

    const dim = this.cube.dimensions[dim_name]

    if (!dim) {
      throw new UndefinedDimension(dim_name)
    }

    if (!level) {
      dd_fields.push(dim.name)
    }
    else {
      if (!Array.isArray(dim.levels) || !dim.levels.find(lvl => lvl.name === level)) {
        throw new UndefinedLevel(dim_name, level)
      }

      let i = 0, cur

      do {
        cur = dim.levels[i]
        dd_fields.push(dim.name + '_' + cur.name)
      } while (cur.name !== level && (i++ < dim.levels.length))
    }

    return dd_fields
  }

  _addFrom() {
    if (!this.q) throw 'q is not initialized yet!'

    this.q.from(this.cube.fact_table)
    return this
  }

  _addSelectFields() {
    if (!this.q) throw 'q is not initialized yet!'

    for (const dd of this.drilldowns) {
      const [dim_name, ] = dd.split('.')
      const dim = this.cube.dimensions[dim_name]
      if (!dim) {
        throw new UndefinedDimension(dim_name)
      }

      for (const f of this._getDrilldownFields(dd)) {
        if (dim.type === 'date')
          this.q.field(`EXTRACT(epoch FROM ${f})`, f)
        else
          this.q.field(f)
      }
    }

    for (const agg of this.cube.aggregates) {
      this.q.field(agg.fn, agg.name)
    }

    return this
  }

  _addWhere() {
    if (!this.q) throw 'q is not initialized yet!'

    for (const f of this.filters) {
      switch (f.type) {
        case 'point':
          this.q.where(`${f.query.field} ${f.query.operator} ${f.query.value}`, f.point)
          break
        case 'set':
          this.q.where(`${f.query.field} ${f.query.operator} ${f.query.value}`, ...f.set)
          break
        case 'range':
          this.q.where(`${f.query.field} ${f.query.operator} ${f.query.value}`, f.low, f.high)
          break
        default:
          break
      }
    }

    return this
  }

  _addGroupBy() {
    if (!this.q) throw 'q is not initialized yet!'

    for (const dd of this.drilldowns) {
      for (const f of this._getDrilldownFields(dd)) {
        this.q.group(f)
      }
    }

    return this
  }
}

module.exports = QueryBuilder
