<?php

# ---------------------------------------------
# Mileagae Rates (Per ONE-WAY km)
# ---------------------------------------------

function GetMileageRates($con, $userid)
{
	$mileageRatesTable = ConfigServer::mileageRatesTable;

    return SqlResultArray($con, 
        "SELECT 
            mr.id,
            mr.engineSizeCC,
            mr.ratePerOneWayKm
         FROM $mileageRatesTable mr
         ORDER BY mr.engineSizeCC");
}

?>