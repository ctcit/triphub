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
		FROM
			$newslettersTable
		$where
		ORDER by id");
}

?>