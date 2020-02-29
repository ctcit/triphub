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
            r.routenotes,
            r.left,r.top,r.right,r.bottom,
            r.trackdate,
            r.routesummary
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
            r.gpx,
            r.routesummary
         FROM $routesTable r 
         LEFT JOIN $membersTable m ON r.originatorid = m.id
         WHERE r.id = $id
         ORDER BY r.caption");
 }

 function UpdateRouteSummary($con, $userid, $id, $routesummary)
 {
     $routesTable      = ConfigServer::routesTable;
     $membersTable     = ConfigServer::membersTable;
 
     return SqlExecOrDie($con, 
         "UPDATE $routesTable SET 
             routesummary = '$routesummary' 
             WHERE id = $id");
  }
 
 ?>