const sq = require('../../../../utils/squel_extensions')
const _ = require('lodash')
const QueryBuilder = require('../query')

const BrandContext = require('../../../Brand/context')

class DealsBaseQueryBuilder extends QueryBuilder {
  async facts(options = {}) {
    const context_defs = await BrandContext.getByBrand(this.brand_id)
    this.context_defs = _.keyBy(context_defs, 'key')

    return super.facts(options)
  }

  _training_brands() {
    return sq.select()
      .field('bc.id')
      .from('brands')
      .from(sq.rstr('brand_children(brands.id)'), 'bc(id)')
      .where('training IS TRUE')
  }

  _matching_brands() {
    // @ts-ignore
    return sq.select()
      .field('id')
      .from(sq.rstr('brand_children(?)', this.brand_id), 'bc(id)')
      .union(
        sq.select().field('id').from('training_brands'),
        'EXCEPT'
      )
  }

  _deal_info() {
    return sq.select()
      .field('d.id')
      .field('d.title')
      .field('d.brand')
      .field('bc.deal_type')
      .field('bc.property_type')
      .field('dc.id', 'checklist')

      .from('deals', 'd')
      .join('deals_checklists', 'dc', 'd.id = dc.deal')
      .join('brands_checklists', 'bc', 'bc.id = dc.origin')

      .where('d.faired_at IS NOT NULL')
      .where('d.brand = ANY(?)', sq.select().field('id').from('matching_brands'))
      .where('dc.deleted_at IS NULL')
      .where('dc.deactivated_at IS NULL')
      .where('dc.terminated_at IS NULL')
  }

  _agent_info() {
    return sq.select()
      .field('dr.deal')
      .field('dr.checklist')
      .field('dr.role')
      .field(sq.rstr(`
        array_to_string(
          array_remove(ARRAY[
            dr.legal_first_name,
            dr.legal_middle_name,
            dr.legal_last_name
          ], ''),
          ' ',
          NULL
        )
      `), 'name')

      .from('deals_roles', 'dr')

      .where('dr.deleted_at IS NULL')
      .where(sq.expr().or('dr.role = ?', 'BuyerAgent').or('dr.role = ?', 'SellerAgent'))
  }

  _role_info() {
    return sq.select()
      .field('dr.deal')
      .field('dr.checklist')
      .field('dr.role')
      .field(sq.rstr(`
        string_agg(
          array_to_string(
            array_remove(ARRAY[
              dr.legal_first_name,
              dr.legal_middle_name,
              dr.legal_last_name
            ], ''),
            ' ',
            NULL
          ) || ' (' || array_to_string(ARRAY[
            dr.email,
            dr.phone_number
          ], ', ', NULL) || ')',
        ', ')
      `), 'name')

      .from('deals_roles', 'dr')

      .where('dr.deleted_at IS NULL')
      .where(sq.expr().or('dr.role = ?', 'Buyer').or('dr.role = ?', 'Seller'))

      .group('dr.deal')
      .group('dr.checklist')
      .group('dr.role')
  }

  _role_field(role) {
    return sq.select()
      .field('name')
      .from(this._role_info(), 'ri')
      .where('role = ?', role)
      .where('ri.deal = di.id')
      .where(sq.expr()
        .or('ri.checklist IS NULL')
        .or('ri.checklist = di.checklist')
      )
      .limit(1)
  }

  _agent_field(role) {
    return sq.select()
      .field('name')
      .from(this._agent_info(), 'ri')
      .where('role = ?', role)
      .where('ri.deal = di.id')
      .where(sq.expr()
        .or('ri.checklist IS NULL')
        .or('ri.checklist = di.checklist')
      )
      .limit(1)
  }

  _context_field(key) {
    if (!this.context_defs) throw 'Nooooo!'

    return sq.select()
      .field(this.context_defs[key].data_type.toLowerCase())
      .from('current_deal_context', 'ci')
      .where('key = ?', key)
      .where('ci.deal = di.id')
      .limit(1)
  }

  _mini_deals() {
    return sq.select()
      .field('di.title')
      .field('di.id')
      .field('di.checklist')
      .field('di.brand')
      .field('di.deal_type')
      .field('di.property_type')
      .field('bo.branch_title')
      .field(this._agent_field('SellerAgent'), 'seller_agent')
      .field(this._agent_field('BuyerAgent'), 'buyer_agent')
      .field(this._role_field('Seller'), 'sellers')
      .field(this._role_field('Buyer'), 'buyers')
      .field(this._context_field('full_address'), 'full_address')
      .field(this._context_field('sales_price'), 'sales_price')
      .field(this._context_field('list_price'), 'list_price')
      .field(this._context_field('closing_date'), 'closing_date')
      .field(this._context_field('contract_date'), 'contract_date')
      .field(this._context_field('list_date'), 'list_date')

      .from('deal_info', 'di')
      .join('brands_branches', 'bo', 'di.brand = bo.id')
  }

  _createQ() {
    super._createQ()

    this.q
      .with('training_brands', this._training_brands())
      .with('matching_brands', this._matching_brands())
      .with('deal_info', this._deal_info())
      .with('agent_info', this._agent_info())
      .with('role_info', this._role_info())
      .with('mini_deals', this._mini_deals())

    return this
  }
}

module.exports = function(cube) {
  return class extends DealsBaseQueryBuilder {
    constructor(drilldowns, filters, user_id, brand_id) {
      super(cube, drilldowns, filters, user_id, brand_id)
    }
  }
}
