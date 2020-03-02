<?php

function GetNewsletters($con, $userid, $id = 0, $query = null) {
	$newslettersTable = ConfigServer::newslettersTable;
	$where = "";
	if ($id != 0)
	{
		$where = "WHERE id = $id";
	}
	else
	{
		if (array_key_exists("since", $query))
		{
			$where = "WHERE `date` >= '".$query[since]."'";
		}
		else if (array_key_exists("volume", $query))
		{
			$where = "WHERE `volume` = '".$query[volume]."'";
		}
	}

	return SqlResultArray($con,
		"SELECT * 
		FROM $newslettersTable
		$where
		ORDER by id");
}

function GetLatestNewsletter($con, $userid) {
	$newslettersTable = ConfigServer::newslettersTable;
	return SqlResultArray($con,
		"SELECT *
		 FROM $newslettersTable
		 WHERE `date` <= NOW()
		 ORDER BY date Desc LIMIT 1");

}

function GetCurrentNewsletter($con, $userid) {
	$newslettersTable = ConfigServer::newslettersTable;
	return SqlResultArray($con,
		"SELECT * 
		FROM
			$newslettersTable
		WHERE `date` > NOW() AND `isCurrent` = 1
		ORDER by date DESC LIMIT 1");
}

function GetNewsletterVolumes($con, $userid, $volume) {
	$newslettersTable = ConfigServer::newslettersTable;
	$volumeRows = SqlResultArray($con,
		"SELECT DISTINCT volume
		FROM
			$newslettersTable
		ORDER BY volume");
	$volumes = array();
	foreach ($volumeRows as $key => $row) {
		$volumes[] = $row['volume'];
	}
	return $volumes;
}

function GetNewsletterVolume($con, $userid, $volume) {
	return GetNewsletters($con, $userid, 0, array("volume" => $volume));
}

function SetCurrentNewsletter($con, $userId, $newsletterId)
{
	$newslettersTable = ConfigServer::newslettersTable;
	// Check that the specified newsletter exists and its date isn't in the past
	$date = SqlResultScalar($con, "SELECT 1 FROM $newslettersTable WHERE `id` = '$newsletterId' AND `date` > NOW()");
	if ($date == null || $date != 1) {
		return( array("result" => "fail") );
	}

	$currentNewsletters = SqlResultArray($con, "SELECT `id` FROM $newslettersTable WHERE `isCurrent` = 1");

	// Unset everything else
	foreach($currentNewsletters as $key => $newsletter) {
		// There should only be one, but iterate just in case
		$id = $newsletter['id'];
		SqlResultArray($con, "UPDATE $newslettersTable SET `isCurrent` = 0 WHERE `id` = '$id'");
	}

	// Set the new current
	SqlResultArray($con, "UPDATE $newslettersTable SET `isCurrent` = 1 WHERE `id` = '$newsletterId'");
	return( array ( "result" => "success") );
}

?>