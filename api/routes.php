<?php

# ---------------------------------------------
# Routes (triphub.routes)
# ---------------------------------------------

function GetRoutes($con, $userid, $query = null)
{
	$routesTable = ConfigServer::routesTable;
	$membersTable = ConfigServer::membersTable;

    $where = "WHERE r.hidden = FALSE";
    if (array_key_exists("includeHidden", $query) && strcasecmp($query[includeHidden], 'true') == 0)
    {
        $where = "";
    }

    // Selected fields only
    return SqlResultArray($con, 
        "SELECT 
            r.id, 
            r.tripHubId,
            r.ctcRoutesId,
            r.tripReportsId,
            'Routes' AS source, 
            r.title,
            r.description,
            r.date,
            r.creationDate,
            r.gpxFileName,
            r.bounds,
            r.summarizedRoutes,
            r.hidden
         FROM $routesTable r 
         $where
         ORDER BY r.id");
}

function GetRoute($con, $userid, $id)
{
	$routesTable = ConfigServer::routesTable;
	$membersTable = ConfigServer::membersTable;

    // All fields
    return SqlResultArray($con, 
        "SELECT 
            r.id, 
            r.memberId,
            r.tripHubId,
            r.ctcRoutesId,
            r.tripReportsId,
            'Routes' AS source, 
            r.title,
            r.description,
            r.date,
            r.creationDate,
            r.gpxFileName,
            r.bounds,
            r.routes,
            r.summarizedRoutes,
            r.hidden,
            m.firstName,m.lastName
         FROM $routesTable r 
         LEFT JOIN $membersTable m ON r.memberId = m.id
         WHERE r.id = $id
         ORDER BY r.id");
 }

# ---------------------------------------------
# CTC Routes (ctc.routes)
# ---------------------------------------------

//     SELECT `id`, `originatorid`, `left`, `top`, `right`, `bottom`, `trackdate`, `hidden`, `caption`, 
//     `gpxfilename`, `routenotes`, `gpx`, `routesummary` FROM `routes`

function GetCtcRoutes($con, $userid)
{
	$ctcRoutesTable   = ConfigServer::ctcRoutesTable;

    // Selected fields only
    return SqlResultArray($con, 
        "SELECT 
            r.id AS ctcRoutesId, 
            'CtcRoutes' AS source, 
            r.caption AS title,
            r.trackdate AS date
         FROM $ctcRoutesTable r 
         WHERE hidden = 0 
         ORDER BY r.id");
}

function GetCtcRoute($con, $userid, $id)
{
	$ctcRoutesTable = ConfigServer::ctcRoutesTable;
	$membersTable = ConfigServer::membersTable;

    // All fields
    return SqlResultArray($con, 
        "SELECT 
            r.id AS ctcRoutesId, 
            r.originatorid AS memberId,
            'CtcRoutes' AS source, 
            r.caption AS title,
            r.routenotes AS description,
            r.gpxfilename AS gpxFileName,
            r.trackdate AS date,
            r.gpx,
            m.firstName,m.lastName
         FROM $ctcRoutesTable r 
         LEFT JOIN $membersTable m ON r.originatorid = m.id
         WHERE r.id = $id
         ORDER BY r.id");
 }

# ---------------------------------------------
# Trip Reports Routes (tripreports.tripreport, tripreports.tripreport_gpx, tripreports.gpx)
# ---------------------------------------------

//     SELECT `id`, `trip_type`, `year`, `month`, `day`, `duration`, `date_display`, `user_set_date_display`, `title`, 
//     `body`, `map_copyright`, `uploader_id`, `uploader_name`, `upload_date`, `deleter_id`, `last_modified` FROM `tripreport`
//     SELECT `id`, `tripreport_id`, `gpx_id`, `ordering` FROM `tripreport_gpx`
//     SELECT `id`, `name`, `gpx`, `caption` FROM `gpx`

function GetTripReportsRoutes($con, $userid)
{
    $tripReportsTripReportTable = ConfigServer::tripReportsTripReportTable;
	$tripReportsTripReportGpxTable = ConfigServer::tripReportsTripReportGpxTable;
	$tripReportsGpxTable = ConfigServer::tripReportsGpxTable;

    // Selected fields only
    return SqlResultArray($con, 
        "SELECT 
            r.id AS tripReportsId, 
            'TripReports' AS source, 
            r.title,
            STR_TO_DATE(CONCAT(r.year, '-', r.month, '-', r.day), '%Y-%m-%d') as date
         FROM $tripReportsTripReportTable r 
         JOIN (SELECT DISTINCT tripreport_id FROM $tripReportsTripReportGpxTable) rg ON r.id = rg.tripreport_id
         ORDER BY r.id");
}

function GetTripReportsRoute($con, $userid, $id)
{
    $tripReportsTripReportTable = ConfigServer::tripReportsTripReportTable;
	$tripReportsTripReportGpxTable = ConfigServer::tripReportsTripReportGpxTable;
	$tripReportsGpxTable = ConfigServer::tripReportsGpxTable;
	$membersTable = ConfigServer::membersTable;

    $sql = "SET SESSION group_concat_max_len = 10000000";
    mysqli_query($con, $sql);

    // All fields
    return SqlResultArray($con, 
        "SELECT 
            r.id AS tripReportsId, 
            r.uploader_id AS memberId,
            'TripReports' AS source, 
            r.title,
            r.body AS description,
            STR_TO_DATE(CONCAT(r.year, '-', r.month, '-', r.day), '%Y-%m-%d') as date,
            r.upload_date AS creationDate,
            GROUP_CONCAT(g.name) AS gpxFileName,
            GROUP_CONCAT( CONVERT(g.gpx USING utf8) SEPARATOR '<GpxSeparator/>') AS gpx,
            m.firstName, m.lastName
         FROM $tripReportsTripReportTable r 
         JOIN $tripReportsTripReportGpxTable rg ON r.id = rg.tripreport_id
         JOIN $tripReportsGpxTable g ON g.id = rg.gpx_id
         LEFT JOIN $membersTable m ON r.uploader_id = m.id
         WHERE r.id = $id
         GROUP BY r.id");
 }

 # ---------------------------------------------
# TripHub Trips (triphub.trips)
# ---------------------------------------------

 //     SELECT `id`, `approval`, `isDeleted`, `isSocial`, `isNoSignup`, `title`, `openDate`, `closeDate`, `tripDate`, `length`, 
 //     `departurePoint`, `departureDetails`, `maps`, `routes`, `mapRoute`, `cost`, `grade`, `isLimited`, `maxParticipants`, 
 //     `description`, `logisticInfo`, `historyId`, `legacyTripId`, `legacyEventId` FROM `trips`

function GetTripHubRoutes($con, $userid)
{
    $tripsTable = ConfigServer::tripsTable;

    // Selected fields only
    return SqlResultArray($con, 
        "SELECT 
            r.id AS tripHubId, 
            'TripHub' AS source, 
            r.title,
            r.tripDate AS date
         FROM $tripsTable r 
         WHERE routes IS NOT NULL AND json_length(routes) > 0
         ORDER BY r.id");
}

function GetTripHubRoute($con, $userid, $id)
{
    $tripsTable = ConfigServer::tripsTable;
	$membersTable = ConfigServer::membersTable;

    // All fields
    return SqlResultArray($con, 
        "SELECT 
            r.id AS tripHubId, 
            'TripHub' AS source, 
            r.title,
            r.description,
            r.tripDate AS date,
            r.openDate AS creationDate,
            r.routes
         FROM $tripsTable r 
         WHERE r.id = $id
         ORDER BY r.id");
 }

 ?>