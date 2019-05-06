<?php

class ConfigClient
{
	const show_debug_update    = false;
	const print_lines 		   = 25;
	const edit_refresh_in_sec  = 10;
}

class ConfigServer
{
	const base_url             = "http://www.ctc.org.nz/index.php/current-trips";
	const currency_in_days     = 7;
	const email_has_link       = true;
	const email_has_details    = true;
	const email_has_debug_info = true;
	const email_filter         = "/^alastairgbrown@yahoo\.com\.au$/";
	const editor_roles         = "'Webmaster','Overnight Trip Organiser','Day Trip Organiser','Club Captain'";
	const members_table        = "ctc.members";
	const memberships_table    = "ctc.memberships";
	const roles_table          = "ctc.roles";
	const member_roles_table   = "ctc.members_roles";
	const trips_table          = "trip.dev_trips";
	const participants_table   = "trip.dev_participants";
	const change_history_table = "trip.dev_changehistory";
	const edit_table           = "trip.dev_edit";
	const log_all_sql		   = true;
	const api_key              = "6bc3ed05-66a4-4012-96bd-c7192df95997";
	const api_key_expiry       = "20190515";
}

?>