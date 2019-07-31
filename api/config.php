<?php

class ConfigClient
{
	const show_debug_update    = false;
	const print_lines 		   = 25;
	const edit_refresh_in_sec  = 10;
}

class ConfigServer
{
	const base_url             = "https://ctc.org.nz/triphub.dev/";
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
	const trips_table          = "triphub.trips";
	const participants_table   = "triphub.participants";
	const change_history_table = "triphub.changehistory";
	const edit_table           = "triphub.edit";
	const maps_table           = "triphub.maps";
	const log_table            = "triphub.log";
	const log_level_filter     = "/.*/";
	const api_key              = "6bc3ed05-66a4-4012-96bd-c7192df95997";
	const api_key_expiry       = "20190815";
	const api_key_user_id	   = 125;
}

?>