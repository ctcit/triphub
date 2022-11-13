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
            d.toLocation AS 'to', 
            d.area,
            d.fromLocation AS 'from',
            d.distance
         FROM $destinationsTable d 
         ORDER BY d.distance");
}

?>