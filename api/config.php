<?php

class ConfigClient
{
	const showDebugUpdate     = false;
	const printLines 		  = 25;
	const editRefreshInSec    = 10;
	const calendarStartOfWeek = 1; //0=Sun,6=Sat
}

class ConfigServer
{
	const triphubUrl          = "https://ctc.org.nz/index.php/trip-signup/";
	const currencyInDays      = 7;
	const emailHasLink        = true;
	const emailHasDetails     = true;
	const emailHasDebugInfo   = false;
	const emailFilter         = "/^.*$/";
	const adminUpdateEmail	  = "webmaster@ctc.org.nz";
	const newMembersRepView   = "triphub.view_new_members_rep";
	const membersTable        = "ctc.members";
	const membershipsTable    = "ctc.memberships";
	const committeeTable      = "ctc.view_committee";
	const newslettersTable    = "newsletter.newsletters";
	const noticesTable        = "newsletter.notices";
	const newsletterEventsTable = "triphub.vnl_events";
	const newsletterUnpublishedEventsTable = "triphub.vnl_unpub_events";
	const newsletterTripReportsTable    = "newsletter.newsletter_tripreports";
	const memberRolesTable    = "triphub.view_members_roles";
	const routesTable         = "ctc.routes";
	const tripsTable          = "triphub.trips";
	const participantsTable   = "triphub.participants";
	const historyTable        = "triphub.history";
	const editTable           = "triphub.edit";
	const mapsTable           = "triphub.maps";
	const logTable            = "triphub.log";
	const logLevelFilter      = "/.*/";
	const apiKey              = "6bc3ed05-66a4-4012-96bd-c7192df95997";
	const apiKeyExpiry        = "20201230";
	const apiKeyUserId	      = 2218;
}

?>
