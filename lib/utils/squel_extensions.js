const squel = require('squel').useFlavour('postgres')

const cls = squel.cls

// append to string if non-empty
function _pad (str, pad) {
  return (str.length) ? str + pad : str
}

// WITH VALUES
cls.WithValuesBlock = class extends cls.AbstractSetFieldBlock {
  withValues (alias, values) {
    this._alias = alias
    this._setFieldsRows(values)
  }

  _toParamString (options = {}) {
    const { buildParameterized } = options

    const fieldString = this._fields
      .map((f) => this._formatFieldName(f))
      .join(', ')

    const valueStrings = [],
      totalValues = []

    for (let i = 0; i < this._values.length; ++i) {
      valueStrings[i] = ''

      for (let j = 0; j < this._values[i].length; ++j) {
        const ret =
          this._buildString(this.options.parameterCharacter, [this._values[i][j]], {
            buildParameterized: buildParameterized,
            formattingOptions: this._valueOptions[i][j],
          })

        ret.values.forEach(value => totalValues.push(value))

        valueStrings[i] = _pad(valueStrings[i], ', ')
        valueStrings[i] += ret.text
      }
    }

    return {
      text: fieldString.length
        ? `WITH ${this._alias} (${fieldString}) AS ( VALUES (${valueStrings.join('), (')}) )`
        : '',
      values: totalValues
    }
  }
}

// SELECT query builder.
cls.Select = class extends cls.QueryBuilder {
  constructor (options, blocks = null) {
    blocks = blocks || [
      new cls.WithBlock(options),
      new cls.WithValuesBlock(options),
      new cls.StringBlock(options, 'SELECT'),
      new cls.FunctionBlock(options),
      new cls.DistinctOnBlock(options),
      new cls.GetFieldBlock(options),
      new cls.FromTableBlock(options),
      new cls.JoinBlock(options),
      new cls.WhereBlock(options),
      new cls.GroupByBlock(options),
      new cls.HavingBlock(options),
      new cls.OrderByBlock(options),
      new cls.LimitBlock(options),
      new cls.OffsetBlock(options),
      new cls.UnionBlock(options)
    ]

    super(options, blocks)
  }
}

cls.Update = class extends cls.QueryBuilder {
  constructor (options, blocks = null) {
    blocks = blocks || [
      new cls.WithBlock(options),
      new cls.WithValuesBlock(options),
      new cls.StringBlock(options, 'UPDATE'),
      new cls.UpdateTableBlock(options),
      new cls.SetFieldBlock(options),
      new cls.FromTableBlock(options),
      new cls.WhereBlock(options),
      new cls.OrderByBlock(options),
      new cls.LimitBlock(options),
      new cls.ReturningBlock(options),
    ]

    super(options, blocks)
  }
}

class SqArray extends Array {}
squel.SqArray = SqArray

squel.registerValueHandler(SqArray, function(arr) {
  return arr
})

squel.registerValueHandler('undefined', function(arr) {
  return null
})

module.exports = squel
