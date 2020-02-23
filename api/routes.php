<?php

function GetRoutes($con, $userid)
{
	$routesTable      = ConfigServer::routesTable;
	$membersTable     = ConfigServer::membersTable;

    // Selected fields only
    return SqlResultArray($con, 
        "SELECT 
            r.id, 
            r.caption,
            r.left,r.top,r.right,r.bottom,
            r.trackdate
         FROM $routesTable r 
         WHERE hidden = 0 
         ORDER BY r.caption");
}

function GetRoute($con, $userid, $id)
{
	$routesTable      = ConfigServer::routesTable;
	$membersTable     = ConfigServer::membersTable;

    // All fields
    return SqlResultArray($con, 
        "SELECT 
            r.id, 
            r.caption,
            r.gpxfilename,
            r.routenotes,
            r.originatorid,
            r.left,r.top,r.right,r.bottom,
            r.trackdate,
            m.firstName,m.lastName,
            r.gpx
         FROM $routesTable r 
         LEFT JOIN $membersTable m ON r.originatorid = m.id
         WHERE r.id = $id
         ORDER BY r.caption");
 }

?>