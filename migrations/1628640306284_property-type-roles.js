const db = require('../lib/utils/db')

//                                 Lease           Sale
// Buyer                                            X
// BuyerAgent                       X               X
// CoBuyerAgent                     O               O                  
// BuyerPowerOfAttorney                             O
// BuyerLawyer                                      O
// BuyerReferral                                    O

// Seller                                           X
// SellerAgent                      X               X
// CoSellerAgent                    O               O
// SellerPowerOfAttorney                            O
// SellerLawyer                                     O
// SellerReferral                                   O

// Title                                            O
// Lender                                           O
// Appraiser                                        O


// Tenant                           X
// TenantPowerOfAttorney            O

// Landlord                         X
// LandlordPowerOfAttorney          O

// Lawyer                           O               O
// TeamLead                         O               O

const migrations = [
  'BEGIN',
  'ALTER TABLE brands_property_types ADD required_roles deal_role[]',
  'ALTER TABLE brands_property_types ADD optional_roles deal_role[]',

  `UPDATE brands_property_types SET 
    required_roles = ARRAY[
      'Buyer', 
      'BuyerAgent',

      'Seller',
      'SellerAgent'
    ]::deal_role[],

    optional_roles = ARRAY[
      'CoBuyerAgent',
      'BuyerPowerOfAttorney',
      'BuyerLawyer',
      'BuyerReferral',

      'CoSellerAgent',
      'SellerPowerOfAttorney',
      'SellerLawyer',
      'SellerReferral',

      'Title',
      'Lender',
      'Appraiser',
      'Lawyer',
      'TeamLead'
    ]::deal_role[]
  WHERE is_lease = FALSE`,

  `UPDATE brands_property_types SET 
    required_roles = ARRAY[
      'Tenant', 
      'BuyerAgent',

      'Landlord',
      'SellerAgent'
    ]::deal_role[],

    optional_roles = ARRAY[
      'CoBuyerAgent',
      'CoSellerAgent',

      'TenantPowerOfAttorney',
      'LandlordPowerOfAttorney',

      'Lawyer',
      'TeamLead'
    ]::deal_role[]
  WHERE is_lease = TRUE`,

  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
