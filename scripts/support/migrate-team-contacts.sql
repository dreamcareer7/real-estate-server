update contacts set brand = usb.brand from users_solo_brands usb where "user" = usb.id;
update contacts_summaries set brand = usb.brand from users_solo_brands usb where "user" = usb.id;
update contact_search_lists set brand = usb.brand from users_solo_brands usb where created_by = usb.id;
update crm_tasks set brand = usb.brand from users_solo_brands usb where created_by = usb.id;
update contacts_attribute_defs set brand = usb.brand from users_solo_brands usb where "user" = usb.id;