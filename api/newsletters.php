<?php

function GetNewsletters($con, $userid, $id = 0) {
	$newslettersTable  = ConfigServer::newslettersTable;
	$where			   = $id === 0 ? "" : "WHERE id = $id";

	return SqlResultArray($con,
		"SELECT * 
		FROM
			$newslettersTable
		$where
		ORDER by id");
}

?>