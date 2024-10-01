<?php

class ConfigClient
{
	const showDebugUpdate       	= false;
	const printLines 		    	= 25;
	const editRefreshInSec      	= 10;
	const calendarStartOfWeek   	= 1; //0=Sun,6=Sat
	const prerequisiteEquipment 	= 'Ice Axe,Crampons,Helmet,Harness,Avalanche Gear';
	const prerequisiteSkills    	= 'Snow Skills,River Crossing,Avalanch Training';
	const loginUrl					= 'https://ctc.org.nz/index.php/log-in';
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
	const membershipTypesTable    = "ctc.membership_types";
	const committeeTable      = "ctc.view_committee";
	const newslettersTable    = "newsletter.newsletters";
	const noticesTable        = "newsletter.notices";
	const newsletterEventsTable = "triphub.vnl_events";
	const newsletterUnpublishedEventsTable = "triphub.vnl_unpub_events";
	const newsletterTripReportsTable    = "newsletter.newsletter_tripreports";
	const memberRolesTable    = "triphub.view_members_roles";
	const ctcRoutesTable      = "ctc.routes";
	const tripReportsTripReportTable = "tripreports.tripreport";
	const tripReportsTripReportGpxTable = "tripreports.tripreport_gpx";
	const tripReportsGpxTable = "tripreports.gpx";
	const tripsTable          = "triphub.trips";
	const participantsTable   = "triphub.participants";
	const historyTable        = "triphub.history";
	const editTable           = "triphub.edit";
	const mapsTable           = "triphub.maps";
	const routesTable 		  = "triphub.routes";
	const destinationsTable   = "triphub.destinations";
	const mileage_ratesTable  = "triphub.mileage_rates";
	const logTable            = "triphub.log";
	const logLevelFilter      = "/.*/";
	const logLinesRetained    = 10000;
	const apiKey              = "";//Should be blank in production
	const apiKeyExpiry        = "00000000";//YYYYMMDD Should be 00000000 in production 
	const apiKeyUserId	      = 2218;
}

?>
