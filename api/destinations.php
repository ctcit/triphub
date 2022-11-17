<?php

# ---------------------------------------------
# Common Trip Destinations
# ---------------------------------------------

function GetDestinations($con, $userid)
{
	$destinationsTable = ConfigServer::destinationsTable;

    return SqlResultArray($con, 
        "SELECT 
            d.id,
            d.toLocation, 
            d.area,
            d.fromLocation,
            d.distance
         FROM $destinationsTable d 
         ORDER BY d.distance");
}

?>