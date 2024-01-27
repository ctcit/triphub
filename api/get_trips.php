<?php

    require_once( 'utilities.php' );
    require('config.php');
    require('trips.php');

    const _NOT_SIGNED_IN = 0;
    echo json_encode( GetTrips($con, _NOT_SIGNED_IN) );

?>
