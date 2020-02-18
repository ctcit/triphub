<?php

function GetNewsletters($con, $userid, $id = 0, $query = null) {
	$since = "";
	if (array_key_exists("since", $query))
	{
		$since = $query["since"];
	}
	$newslettersTable = ConfigServer::newslettersTable;
	$where = "";
	if ($id != 0)
	{
		$where = "WHERE id = $id";
	}
	else if ($since != "")
	{
		$where = "WHERE `date` >= '$since'";
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
		ORDER by date DESC LIMIT 1");
}

?>