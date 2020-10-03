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

function GetEvents($con, $userid, $unpublished=false) {
	$table = ($unpublished) ? ConfigServer::newsletterUnpublishedEventsTable : ConfigServer::newsletterEventsTable;
	return SqlResultArray($con,
		"SELECT * 
		FROM
			$table
		ORDER by dateDisplay ASC");
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

function GetNewsletterTripReports($con, $userId, $newsletterId)
{
	$table = ConfigServer::newsletterTripReportsTable;

	$query = "SELECT `newsletter`, `tripreport`, `publish` FROM $table where `newsletter` = '$newsletterId'";

	return SqlResultArray($con, $query);
}

function PatchNewsletterTripReports($con, $userId, $newsletterId, $tripReportList)
{
	$table = ConfigServer::newsletterTripReportsTable;

	foreach ($tripReportList as $col => $tripReport)
	{
		$tripReportId = $tripReport["tripreport"];
		$publish = $tripReport["publish"];

		if ($newsletterId != $tripReport["newsletter"])
		{
			die("Invalid data");
		}

		$existsQuery = "SELECT COUNT(*) FROM $table WHERE
					   `newsletter` = '$newsletterId' AND `tripreport` = '$tripReportId'";
		if (SqlResultScalar($con, $existsQuery) != 0)
		{
			$updateQuery = "UPDATE $table SET `publish` = '$publish' WHERE
						`newsletter` = '$newsletterId' AND `tripreport` = '$tripReportId'";
			SqlExecOrDie($con, $updateQuery);
		}
		else
		{
			// Didn't exist, insert instead
			$insertQuery = "INSERT INTO $table (`newsletter`, `tripreport`, `publish` )
							VALUES( '$newsletterId', '$tripReportId', '$publish' )";
			SqlExecOrDie($con, $insertQuery);
		}
	}

	return GetNewsletterTripReports($con, $userId, $newsletterId);
}

function GetNotices($con, $userid, $id = 0, $query = null, $sort_by_expiry = false) {
	$noticesTable = ConfigServer::noticesTable;
	$newslettersTable = ConfigServer::newslettersTable;
    $limit = (array_key_exists("limit", $query)) ? "limit $query[limit]" : "";
    $offset = (array_key_exists("offset", $query)) ? "offset $query[offset]" : "";
	$where = "";
	if ($id != 0)
	{
		$where = "WHERE id = $id";
    }
    else
    {
		if (array_key_exists("date_after", $query))
		{
			$where = "WHERE `date` >= '$query[date_after]'";
        }
		else if (array_key_exists("date_before", $query))
		{
			$where = "WHERE `date` < '$query[date_before]'";
        }
	}
	$order = "";
	if ($sort_by_expiry)
	{
		$order = "ORDER by `date` DESC";
	}
	else
	{
		$order = "ORDER by `order` ASC";
	}
    return SqlResultArray($con,
        "SELECT `id`, `order`, `section`, `date`, `publish`, `title`, `text` 
        FROM $noticesTable
        $where
        $order $limit $offset");
}

function GetCurrentNotices($con, $userid, $id = 0, $query = array()) {
	$newslettersTable = ConfigServer::newslettersTable;
    $expiry = SqlResultScalar($con, "SELECT date FROM $newslettersTable WHERE `isCurrent` = 1");

    if ($expiry != null)
    {
        $query["date_after"] = $expiry;
        return GetNotices($con, $userid, $id, $query);
    }
    else
    {
        return array();
    }
}

function GetExpiredNotices($con, $userid, $id = 0, $query = array()) {
	$newslettersTable = ConfigServer::newslettersTable;
    $expiry = SqlResultScalar($con, "SELECT date FROM $newslettersTable WHERE `isCurrent` = 1");

    if ($expiry != null)
    {
        $query["date_before"] = $expiry;
        return GetNotices($con, $userid, $id, $query, true);
    }
    else
    {
        return array();
    }
}