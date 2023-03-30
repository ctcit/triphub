<?php

function GetTrips(mysqli $con, int $userId, string $where=null): array {
	$currencyInDays	     = ConfigServer::currencyInDays;
	$tripsTable          = ConfigServer::tripsTable;
	$participantsTable   = ConfigServer::participantsTable;
	$historyTable        = ConfigServer::historyTable;
	$membersTable        = ConfigServer::membersTable;
	$where 				 = $where ?? "t.tripDate > DATE_ADD(now(),INTERVAL -$currencyInDays DAY)";

	// Change the trips table to store enum "approval".
	// Return as a string and cast in the typescript (decouples numbering)

	$trips = SqlResultArray($con,
	   "SELECT *,
	   		(CASE
			   WHEN isDeleted    		    THEN 'Deleted'
			   WHEN approval  != 'Approved' THEN approval
			   WHEN CURDATE() < openDate 	THEN approval
			   WHEN CURDATE() <= closeDate	THEN 'Open' ELSE 'Closed'
			END) 			as `state`,
			'' 				as `role`,
			JSON_ARRAY()	AS `leaders`,
			JSON_ARRAY()	AS `nonleaders`,
			JSON_ARRAY()	AS `editors`
		FROM $tripsTable t
		WHERE $where
		ORDER BY tripDate","id");

	if (!$trips || !$userId) return array_values($trips);

	$tripIds = implode(',',array_keys($trips));

	$participants = SqlResultArray($con,
	   "SELECT DISTINCT
	   		p.tripId,
			coalesce(p.name,concat(trim(m.firstname),' ',trim(m.lastname))) AS `name`,
			p.memberId,
			(CASE WHEN isDeleted THEN 'Deleted' WHEN isLeader THEN 'Leader' ELSE 'Non-Leader' END) AS `role`
		FROM      $participantsTable p
		LEFT JOIN $membersTable      m ON m.id = p.memberId
		WHERE p.tripId IN ($tripIds)

		UNION ALL

		SELECT DISTINCT
			h.tripId,
			concat(trim(m.firstname),' ',trim(m.lastname)) AS `name`,
			h.userId as `memberId`,
			'Editor' AS `role`
		FROM $historyTable h
		JOIN $membersTable m ON m.id = h.userId
		WHERE h.tripId IN ($tripIds)
		AND NOT (h.table = '$participantsTable' AND JSON_EXTRACT(h.after,'$.memberId') = h.userId)");

	$tripRoles = [];
	foreach ($participants as $participant) {
		$tripId = $participant['tripId'];
		$memberId = $participant['memberId'];
		$role = $participant['role'];
		$trips[$tripId][str_replace('-','',strtolower($role)).'s'] []= $participant['name'];

		if ($memberId === $userId) {
			if ($role !== 'Editor' ||
			    !array_key_exists($tripId, $tripRoles) ||
				$tripRoles[$tripId]) {
				// Only set "Editor" role if a role hasn't already been set
				$tripRoles[$tripId] = $role;
			}
		}
	}

	foreach ($trips as &$trip) {
		if ($trip['approval'] === 'Approved' && in_array($trip['state'],['Open','Closed','Approved'])) {
			$trip['role'] = $tripRoles[$trip['id']] ?? '';
			if ($trip['role'] && $trip['role'] !== 'Editor' && $trip['role'] !== 'Deleted') {
				$trip['state'] = 'MyTrips';
			}
		}
	}

	return array_values($trips);
}

function DeleteTripEdits(mysqli $con): void {
	$expiryAge = ConfigClient::editRefreshInSec * 10;
	$table = ConfigServer::editTable;

	SqlExecOrDie($con, "DELETE FROM $table WHERE stamp < TIMESTAMPADD(second,-$expiryAge,UTC_TIMESTAMP())");
}

// Send email function
// $email should be an array with keys 'recipients', 'html', 'subject'
// $historyAction is the action to record in the history table
function SendEmail(mysqli $con, int $tripId, array $email, int $userId=null, string $historyAction='email'): void {
	$historyTable = ConfigServer::historyTable;
	$tripsTable = ConfigServer::tripsTable;
	$headers = "MIME-Version: 1.0\r\n".
			   "Content-type: text/html;charset=UTF-8\r\n".
			   "From: <noreply@ctc.org.nz>\r\n";

	foreach ($email['recipients'] as $recipient) {
		if (filter_var($recipient['email'], FILTER_VALIDATE_EMAIL)) {
			if (!mail($recipient['email'], $email['subject'], $email['html'], $headers)) {
				LogMessage($con,"ERROR","mail() failed $recipient[email], $email[subject], $email[html]");
			}
		}
		else
		{
			LogMessage($con,"WARNING", "Didn't email $recipient[email] as it is invalid");
		}
	}

	$emailJson = SqlVal($con,json_encode($email));
	$userId = $userId ?? "NULL";
	$id = SqlExecOrDie($con, "INSERT $historyTable
								SET	`tripId` = $tripId,
									`userId` = $userId,
									`action` = '$historyAction',
									`timestamp` = UTC_TIMESTAMP(),
									`after` = $emailJson", true);
	SqlExecOrDie($con, "UPDATE $tripsTable SET historyId = $id WHERE id = $tripId");
}

function SendTripEmail(mysqli $con, int $tripId, int $userId=null, string $subject=null, string $message=null): array {
	$email = GetTripHtml($con, $tripId, $subject, $message);
	SendEmail($con, $tripId, $email, $userId);
	return $email;
}

function SendApprovalEmail(mysqli $con, int $tripId): array {
	$participantsTable = ConfigServer::participantsTable;
	$trip = GetTrips($con, 0, "t.id = $tripId")[0];

	$leader = SqlResultScalar($con,"SELECT name
									FROM $participantsTable
									WHERE tripId = $tripId AND isLeader = 1 LIMIT 1","id");

	$committeeTable = ConfigServer::committeeTable;
	$recipients = SqlResultArray($con, "SELECT fullName, email
										FROM $committeeTable
										WHERE role IN ('IT Convenor', 'Day Trip Organiser', 'Overnight Trip Organiser')");
	$tripLink = ConfigServer::triphubUrl."/#/trips/$trip[id]";

	$email = ["recipients"=>[]];

	foreach ($recipients as $index => &$participant) {
		$email['recipients'] []= ['name'=>$participant['fullName'],'email'=>$participant['email']];
	}

	$email['html'] = "<p>A new trip \"$trip[title]\" has been added".
					 ( $leader ? " by $leader" : "").
					 ".</p>".
					 "<p>Please go to <a href=\"$tripLink\">$tripLink</a> to check and approve this trip.</p>";
	$email['messageId'] = MakeGuid();
	$email['originalMessageId'] = MakeGuid();
	$email['trip'] = $trip;
	$email['subject'] = "New CTC trip for approval - $trip[title]";

	SendEmail($con, $tripId, $email, null, 'approvalEmail');
	return $email;
}

function PostEmails(mysqli $con): array {

	// Step 1 - Send emails arising from edits
	DeleteTripEdits($con);

	$tripsTable = ConfigServer::tripsTable;
	$historyTable = ConfigServer::historyTable;
	$editTable = ConfigServer::editTable;
	$trips = SqlResultArray($con,
				"SELECT t.id, t.title, t.tripDate
				FROM $tripsTable t
				LEFT JOIN $editTable e on e.tripId = t.id
				WHERE t.tripDate > NOW() - INTERVAL 1 MONTH
				AND e.id IS NULL
				AND coalesce((SELECT max(h.id) FROM $historyTable h WHERE h.tripId = t.id),9999999) > t.historyId
				ORDER BY t.id");

	foreach ($trips as &$trip) {
		$trip['email'] = SendTripEmail($con,$trip['id'],0);
	}

	// Step 2 - Send emails for trips that require approval
	$newTrips = SqlResultArray($con,
					"SELECT t.id, t.title, t.tripDate
					FROM $tripsTable t WHERE approval = 'PENDING'
					AND tripDate > NOW()
					AND (SELECT COUNT(*)
						 FROM $historyTable h
						 WHERE h.tripId = t.id
						 AND h.action = 'approvalemail') = 0
					ORDER BY t.id");

	foreach ($newTrips as &$trip) {
		$trip['email'] = SendApprovalEmail($con, $trip['id']);
	}

	return array_merge($trips, $newTrips);
}

function GetTripHtmlValue(array $col, array $row, string $true="Yes", string $false=""): string {
	$val = $row[$col['Field']];
	switch ($col["Type"]) {
		case "bit(1)":
			return $val ? $true : $false;
		case "date":
			return date('D j M Y', strtotime($val));
		default:
			if (is_array($val)) {
				$return = "";
				foreach ($val as $key => $item) {
					if (is_string($item)) {
						$return .= htmlentities($item);
					} else {
						$valStr = print_r($val, true);
						trigger_error("Unexpected type (".gettype($item).") for item with key=$key val=$valStr");
					}
				}
				return $return;
			} else {
				return htmlentities($val);
			}
	}
}

function SortParticipants(array &$participants): void {
	$participants = array_values($participants);
	foreach ($participants as &$participant) {
		$participant['order'] = $participant['displayPriority'] ?? $participant['id'];
	}

	array_multisort(
		array_column($participants,'isDeleted'),SORT_ASC,SORT_NUMERIC,
		array_column($participants,'isLeader'),SORT_DESC,SORT_NUMERIC,
		array_column($participants,'order'),SORT_ASC,SORT_NUMERIC,$participants);
}

function ClassifyParticipants(array &$participants, array $trip): array {
	foreach ($participants as $index => &$participant) {
		$participant['index'] = $index;
		$participant['classification'] =
			($participant['isCreated'] ? 'not-listed' :
			($participant['isDeleted'] ? 'removed' :
			($participant['isLeader'] ? 'leader' :
			($trip['isLimited'] && $index >= $trip['maxParticipants'] ? 'waitlisted' : 'listed'))));
	}

	return array_combine(array_column($participants, 'id'), $participants);
}

function GetTripHtml(mysqli $con, int $tripId, string $subject=null, string $message=null): array {
	$tripsTable 		= ConfigServer::tripsTable;
	$participantsTable	= ConfigServer::participantsTable;
	$historyTable 		= ConfigServer::historyTable;
	$membersTable      	= ConfigServer::membersTable;
	$trip				= GetTrips($con, 0, "t.id = $tripId")[0];
	$participants		= SqlResultArray($con,"SELECT *
											   FROM $participantsTable
											   WHERE tripId = $tripId","id");
	$oldTrip 			= $trip;
	$oldParticipants	= $participants;
	$changes    		= SqlResultArray($con,"SELECT h.*,
													coalesce(concat(trim(m.firstname),' ',trim(m.lastname)),'?') as changedby
											   FROM $historyTable h
											   LEFT JOIN $membersTable m ON m.id = h.userId
											   WHERE h.tripId = $tripId AND h.id > $trip[historyId]
											   ORDER BY id DESC");
	$tripsInfo			= SqlResultArray($con,"SHOW FULL COLUMNS FROM $tripsTable", "Field");
	$participantsInfo	= SqlResultArray($con,"SHOW FULL COLUMNS FROM $participantsTable", "Field");
	$css				= ParseCss(file_get_contents("trips.css"));
	$updated			= "background-color:".$css[".updated"]["background-color"].";";
	$inserted			= "background-color:".$css[".inserted"]["background-color"].";";
	$deleted			= "color:".$css[".deleted"]["color"].";";
	$border				= "border: solid 1px black; border-collapse: collapse;";
	$ignore				= ['id','approval','isDeleted','isSocial','isNoSignup','routes','mapRoute',
						   'isLimited','lastEmailChangeId','tripId','memberId','displayPriority',
						   'historyId','legacyTripId','legacyEventId'];
	$message			= $message == null ? "" : "<h3>Message from the trip leader:</h3><p>".htmlentities($message)."</p>";
	$email				= ["recipients"=>[], "filteredRecipients"=>[]];
	$tripChanges        = false;
	$columnChange 		= [];

	if (!$trip['isLimited']) {
		$ignore []= 'maxParticipants';
	}

	// re-create old version of trip into $oldTrip and $oldParticipants
	foreach ($changes as $change) {
		$before = $change['before'];
		$column = $change['column'];
		switch("$change[action] $change[table]") {
			case "create $participantsTable":
				$oldParticipants[$change['participantId']]['isCreated'] = true;
				break;
			case "update $tripsTable":
				$oldTrip[$column] = $before;
				if (!array_key_exists($column, $columnChange)) {
					$columnChange[$column] = $change;
				}
				break;
			case "update $participantsTable":
				$oldParticipants[$change['participantId']][$column] = $before;
				break;
		}
	}

	SortParticipants($participants);
	SortParticipants($oldParticipants);
	ClassifyParticipants($participants, $trip);
	$oldParticipants = ClassifyParticipants($oldParticipants, $oldTrip);

	// Trip details
	$header	= "";
	foreach ($tripsInfo as $field => $col) {
		if (in_array($field, $ignore)) {
			continue;
		}
		$val = GetTripHtmlValue($col,$trip,"Yes","No");

		if (preg_match('/.*Id$/',$field) || $val === '')  {
			continue;
		}

		$style = $border.($trip[$field] === $oldTrip[$field] ? "" : $updated);
		$header .= "<tr><th style='$style'>".htmlentities($col['Comment'])."</th>
						<td style='$style'>$val</td></tr>";
		$tripChanges = $tripChanges || $oldTrip[$field] != $trip[$field];
	}

	// Column headers for participants
	$detail = "<tr><th>&nbsp;</th>";
	foreach ($participantsInfo as $field => $col) {
		if (!in_array($field, $ignore)) {
			$detail .= "<th style='$border'>".htmlentities($col['Comment'])."</th>";
		}
	}
	$detail .= "</tr>\n";
	$notes = [];


	$oldApproval = $oldTrip['approval'];
	$approval = $trip['approval'];
	if ($oldApproval != $approval) {
		$changedby = $columnChange['approval']['changedby'];
		if ($oldApproval == "Pending" && in_array($approval,["Approved","Rejected"])) {
			$subject = $subject ?? "RE: $trip[title] on $trip[tripDate] has just been $approval";
			$notes []= "<li>This trip has just been <b>$approval</b> by <b>$changedby</b></li>";
		} else {
			$subject = $subject ?? "RE: $trip[title] on $trip[tripDate] has changed from $oldApproval to $approval";
			$notes []= "<li>This trip has just been changed from <b>$oldApproval</b> to <b>$approval</b> by <b>$changedby</b></li>";
		}
	}

	// Rows for participants
	foreach ($participants as $index => &$participant) {
		$id = $participant['id'];
		$isNew = array_key_exists("$id,new",$changes);
		$classification = $participant['classification'];
		$oldClassification = $oldParticipants[$id]['classification'];
		$isCreated = $oldParticipants[$id]['isCreated'];
		$isDeleted = $participant['isDeleted'];
		if ($classification == 'waitlisted' && $index == $trip['maxParticipants']) {
			$detail .= "<tr><td colspan='100' style='$border $deleted'>Waitlist</td></tr>\n";
		} else if ($classification == 'removed' && ($index==0 || !$participants[$index-1]['isDeleted'])) {
			$detail .= "<tr><td colspan='100' style='$border $deleted'>Deleted</td></tr>\n";
		}

		$participantChanges = false;
		$isUpdated = $isNew || $participant['index'] !== $oldParticipants[$id]['index'];
		$style = ($isDeleted ? $deleted : "").($isCreated ? $inserted : ($isUpdated ? $updated :""));
		$detail .= "<tr><td style='$border $style'>".($index+1)."</td>";
		foreach ($participantsInfo as $field => $col) {
			if (in_array($field, $ignore)) {
				continue;
			}
			$isUpdated = $isNew || $participant[$field] !== $oldParticipants[$id][$field];
			$style = ($isDeleted ? $deleted : "").($isCreated ? $inserted : ($isUpdated ? $updated :""));
			$participantChanges = $participantChanges || $isUpdated;
			$detail .= "<td style='$border $style'>".GetTripHtmlValue($col,$participant)."</td>\n";
		}
		$detail .= "</tr>\n";

		if ($classification != $oldClassification) {
			$participantChanges = true;
			$notes []= "<li><b>".htmlentities($participant['name'])."</b> has ".
						($isCreated ? "signed up and is" : "changed from <b>$oldClassification</b> to").
						" <b>$classification</b></li>";
		}

		if ($message != '' || $tripChanges || $participantChanges || ($participant['isLeader'] && count($changes))) {
			if ($participant['isDeleted'])
				$email['deletedRecipients'] []= ['name'=>$participant['name'],'email'=>$participant['email']];
			else if (preg_match(ConfigServer::emailFilter, $participant["email"]))
				$email['recipients'] []= ['name'=>$participant['name'],'email'=>$participant['email']];
			else
				$email['filteredRecipients'] []= ['name'=>$participant['name'],'email'=>$participant['email']];
		}
	}

	$legend = "<tr><th>Legend: </th>
				   <td style='$border $updated'>Updates</td>
				   <td style='$border $inserted'>Additions</td></tr>";
	$email['html'] =
		$message.
		($notes ? "<h3>Please note:</h3>\n<ul>".implode("\n", $notes)."</ul>\n" : "").
		"<h3>Current trip details:</h3>\n".
		"<table style='$border'>$header</table>\n".
		"<h3>Current participants:</h3>\n".
		"<table style='$border'>$detail</table>\n".
		"<table style='$border'>$legend</table>\n";
	$email['messageId'] = MakeGuid();
	$email['originalMessageId'] = MakeGuid();
	$email['trip'] = $trip;
	$email['oldTrip'] = $oldTrip;
	$email['participants'] = $participants;
	$email['oldParticipants'] = $oldParticipants;
	$email['changes'] = $changes;
	$email['notes'] = $notes;
	$email['subject'] = $subject ?? "RE: $trip[title] on $trip[tripDate]";

	return $email;
}

?>