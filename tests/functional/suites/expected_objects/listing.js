const property = require('./property.js')
const v = require('./validation.js')

module.exports = {
  'type': String,
  'id': String,
  'created_at': Number,
  'updated_at': Number,
  'cover_image_url': v.optionalString,
  'currency': String,
  'price': v.optionalNumber,
  'gallery_image_urls': v.optionalStringArray,
  'matrix_unique_id': Number,
  'original_price': v.optionalNumber,
  'last_price': v.optionalNumber,
  'low_price': v.optionalNumber,
  'status': String,
  'association_fee': v.optionalNumber,
  'mls_number': String,
  'association_fee_frequency': v.optionalString,
  'association_fee_includes': v.optionalString,
  'association_type': v.optionalString,
  'unexempt_taxes': v.optionalNumber,
  'financing_proposed': v.optionalString,
  'list_office_mui': v.optionalString,
  'list_office_mls_id': v.optionalString,
  'list_office_name': v.optionalString,
  'list_office_phone': v.optionalString,
  'possession': v.optionalString,
  'co_list_office_mui': v.optionalString,
  'co_list_office_mls_id': v.optionalString,
  'co_list_office_name': v.optionalString,
  'co_list_office_phone': v.optionalString,
  'selling_office_mui': v.optionalString,
  'selling_office_mls_id': v.optionalString,
  'selling_office_name': v.optionalString,
  'selling_office_phone': v.optionalString,
  'co_selling_office_mui': v.optionalString,
  'co_selling_office_mls_id': v.optionalString,
  'co_selling_office_name': v.optionalString,
  'co_selling_office_phone': v.optionalString,
  'list_agent_mui': v.optionalString,
  'list_agent_direct_work_phone': v.optionalString,
  'list_agent_email': v.optionalString,
  'list_agent_full_name': v.optionalString,
  'list_agent_mls_id': v.optionalString,
  'co_list_agent_mui': v.optionalString,
  'co_list_agent_direct_work_phone': v.optionalString,
  'co_list_agent_email': v.optionalString,
  'co_list_agent_full_name': v.optionalString,
  'co_list_agent_mls_id': v.optionalString,
  'selling_agent_mui': v.optionalString,
  'selling_agent_direct_work_phone': v.optionalString,
  'selling_agent_email': v.optionalString,
  'selling_agent_full_name': v.optionalString,
  'selling_agent_mls_id': v.optionalString,
  'co_selling_agent_mui': v.optionalString,
  'co_selling_agent_direct_work_phone': v.optionalString,
  'co_selling_agent_email': v.optionalString,
  'co_selling_agent_full_name': v.optionalString,
  'co_selling_agent_mls_id': v.optionalString,
  'listing_agreement': v.optionalString,
  'capitalization_rate': v.optionalString,
  'compensation_paid': v.optionalString,
  'date_available': v.optionalString,
  'last_status': v.optionalString,
  'mls_area_major': v.optionalString,
  'mls_area_minor': v.optionalString,
  'mls': v.optionalString,
  'move_in_date': v.optionalString,
  'permit_address_internet_yn': v.optionalBoolean,
  'permit_comments_reviews_yn': v.optionalBoolean,
  'permit_internet_yn': v.optionalBoolean,
  'price_change_timestamp': v.optionalString,
  'matrix_modified_dt': String,
  'property_association_fees': v.optionalString,
  'showing_instructions_type': v.optionalString,
  'special_notes': v.optionalString,
  'tax_legal_description': v.optionalString,
  'total_annual_expenses_include': v.optionalString,
  'transaction_type': v.optionalString,
  'virtual_tour_url_branded': v.optionalString,
  'virtual_tour_url_unbranded': v.optionalString,
  'active_option_contract_date': v.optionalString,
  'keybox_type': v.optionalString,
  'keybox_number': v.optionalString,
  'close_date': v.optionalNumber,
  'close_price': v.optionalNumber,
  'back_on_market_date': v.optionalString,
  'deposit_amount': v.optionalNumber,
  'photo_count': v.optionalNumber,
  'deleted_at': v.optionalNumber,
  'dom': v.optionalNumber,
  'cdom': v.optionalNumber,
  'property': property,
  'list_agent': v.optionalObject,
  'favorited': Boolean
}