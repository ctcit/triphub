<?php

# ---------------------------------------------
# Mileagae Rates (Per ONE-WAY km)
# ---------------------------------------------

function GetMileageRates($con, $userid)
{
	$mileage_ratesTable = ConfigServer::mileage_ratesTable;

    return SqlResultArray($con, 
        "SELECT 
            mr.id,
            mr.engineSizeCC,
            mr.ratePerOneWayKm
         FROM $mileage_ratesTable mr
         ORDER BY mr.engineSizeCC");
}

?>