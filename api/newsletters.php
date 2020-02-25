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
		WHERE `date` > NOW()
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

?>