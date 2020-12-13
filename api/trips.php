<?php

function GetTrips($con,$userId,$id = null) {
	$mytrips 			 = 0;
	$open 	  		     = 1;
	$closed 			 = 2;
	$suggested 			 = 3;
	$deleted 			 = 4;
	$rejected 			 = 5;
	$currencyInDays	     = ConfigServer::currencyInDays;
	$tripsTable          = ConfigServer::tripsTable;		
	$participantsTable   = ConfigServer::participantsTable;		
	$historyTable        = ConfigServer::historyTable;
	$membersTable        = ConfigServer::membersTable;
	$where = $id === null ? "t.tripDate > DATE_ADD(now(),INTERVAL -$currencyInDays DAY)" : "t.id = $id";

	// Change the trips table to store enum "approval".
	// Return as a string and cast in the typescript (decouples numbering)

	$trips = SqlResultArray($con, 
	   "SELECT *,
	   		(CASE 
			   WHEN isDeleted = 1			THEN $deleted
			   WHEN approval  = 'Rejected' 	THEN $rejected
			   WHEN approval  = 'Pending' 	THEN $suggested
			   WHEN CURDATE() < openDate 	THEN $suggested
			   WHEN CURDATE() <= closeDate	THEN $open
											ELSE $closed 
			END) 			as tripGroup,
			'' 				as leaders,
			false			as isOpen,
			0 				as participantCount,
			'' 				as `role`
	    FROM $tripsTable t
			WHERE $where
			ORDER BY tripDate");

	$participants = SqlResultArray($con,
	   "SELECT	p.tripId, 
				coalesce(p.name,concat(trim(m.firstname),' ',trim(m.lastname))) as name,
				isLeader
			FROM      $tripsTable t 
			JOIN      $participantsTable p ON p.tripId = t.id and p.isDeleted = 0
			LEFT JOIN $membersTable      m ON m.id = p.memberId
			WHERE $where");

	$roles = SqlResultArray($con,
	   "SELECT c.tripId, 
	   			'Editor'  as role 
			FROM $historyTable c
				JOIN $tripsTable          t on t.id = c.tripId 
				WHERE $where AND c.userId != 0 AND c.userId = $userId 
		UNION
		SELECT p.tripId, 
				(case when p.isDeleted then 'Removed' when p.isLeader then 'Leader' else 'Tramper' end) as role 
			FROM $participantsTable p 
				JOIN $tripsTable        t on t.id = p.tripId 
				WHERE $where AND p.memberId = $userId",
			"tripId");
	
	foreach ($trips as &$trip) {
		$leaders = array();
		$trip["participantCount"] = 0;

		foreach ($participants as &$participant) {
			if ($participant["tripId"] == $trip["id"] && $userId) {
				$trip["participantCount"]++;
				if ($participant["isLeader"] == "1")
					$leaders []= $participant["name"];
			}
		}

		$trip["leaders"] = implode(", ",$leaders);
		$trip["isOpen"] = $trip["tripGroup"] === $open;

		if ($trip["approval"] == "Approved"
			&& $trip["tripGroup"] < $suggested
			&& array_key_exists($trip["id"],$roles) && $roles[$trip["id"]]["role"] != "Removed") {
			$trip["role"] = $roles[$trip["id"]]["role"];
			if ( $roles[$trip["id"]]["role"] != "Editor" )
			{
				$trip["tripGroup"] = $mytrips;
			}
		}
	}

	return $trips;
}

function DeleteTripEdits($con) {
	$expiryAge = ConfigClient::editRefreshInSec * 10;
	$table = ConfigServer::editTable;
	
	SqlExecOrDie($con, "DELETE FROM $table WHERE stamp < TIMESTAMPADD(second,-$expiryAge,UTC_TIMESTAMP())");
}

function SendEmail($con,$tripId,$userId=null,$subject=null,$message=null) {
	$historyTable = ConfigServer::historyTable;
	$tripsTable = ConfigServer::tripsTable;		
	$recipients = [];
	$email = GetTripHtml($con,$tripId,$subject,$message);
	$headers = "MIME-Version: 1.0\r\n".
			   "Content-type: text/html;charset=UTF-8\r\n".
			   "From: <noreply@ctc.org.nz>\r\n";
	   
    foreach ($email['recipients'] as $recipient) {
		if (filter_var($recipient['email'], FILTER_VALIDATE_EMAIL)) {
			if (!mail($recipient['email'], $email['subject'], $email['html'], $headers)) {
				Log($con,"ERROR","mail() failed $recipient[email], $email[subject], $email[html]");
			}
		}
		else
		{
			Log($con,"WARNING", "Didn't email $recipient[email] as it is invalid");
		}
	}

	$emailJson = SqlVal($con,json_encode($email));
	$id = SqlExecOrDie($con, "INSERT $historyTable 
								SET	`tripId` = $tripId, 
									`userId` = $userId, 
									`action` = 'email', 
									`timestamp` = UTC_TIMESTAMP(),
									`after` = $emailJson", true);
	SqlExecOrDie($con, "UPDATE $tripsTable
						SET historyId = $id
						WHERE id = $tripId");

	return $email;
}

function PostEmails($con) {

	DeleteTripEdits($con);

	$tripsTable = ConfigServer::tripsTable;
	$historyTable = ConfigServer::historyTable;
	$editTable = ConfigServer::editTable;
	$trips = SqlResultArray($con, 
				"SELECT t.id, t.title, t.tripDate
				FROM $tripsTable t
				LEFT JOIN $editTable e on e.tripId = t.id
				WHERE e.id IS NULL
				AND coalesce((SELECT max(h.id) FROM $historyTable h WHERE h.tripId = t.id),9999999) > t.historyId
				ORDER BY t.id");

	foreach ($trips as &$trip) {
		$trip['email'] = SendEmail($con,$trip['id'],0);
	}

	return $trips;
}

function GetTripHtmlValue($col,$row,$true="Yes",$false="") { 
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
					$return += htmlentities($item);
				}
				return $return;
			} else {
				return htmlentities($val);
			}
	}
}

function CmpParticipant($a,$b) {
	$dele = intval($a['isDeleted']) - intval($b['isDeleted']);
	$lead = intval($a['isLeader']) - intval($b['isLeader']);
	$disp = Coalesce($a['displayPriority'],$a['id']) - Coalesce($b['displayPriority'],$b['id']);
	return ($dele != 0 ? $dele : ($lead != 0 ? -$lead : $disp));
}

function SortParticipants(&$participants) {
	$participants = array_values($participants);
	usort($participants, "CmpParticipant");
}

function ClassifyParticipants(&$participants, $trip) {
	$classifications = [];

	foreach ($participants as $index => &$participant) {
		$participant['index'] = $index;
		$participant['classification'] =
			($participant['isCreated'] ? 'not-listed' :
			($participant['isDeleted'] ? 'removed' :
			($participant['isLeader'] ? 'leader' :
			($trip['isLimited'] && $index >= $trip['maxParticipants'] ? 'waitlisted' : 'listed'))));
		$classifications[$participant['id']] = $participant;
	}

	return $classifications;
}

function GetTripHtml($con,$id,$subject=null,$message=null) {
	$tripsTable 		= ConfigServer::tripsTable;
	$participantsTable	= ConfigServer::participantsTable;
	$historyTable 		= ConfigServer::historyTable;
	$membersTable      	= ConfigServer::membersTable;
	$trip				= GetTrips($con,'null',$id)[0];
	$participants		= SqlResultArray($con,"SELECT *
											   FROM $participantsTable
											   WHERE tripId = $id","id");
	$oldTrip 			= $trip;
	$oldParticipants	= $participants;
	$changes    		= SqlResultArray($con,"SELECT h.*, 
													coalesce(concat(trim(m.firstname),' ',trim(m.lastname)),'?') as changedby
											   FROM $historyTable h
											   LEFT JOIN $membersTable m ON m.id = h.userId
											   WHERE h.tripId = $id AND h.id > $trip[historyId]
											   ORDER BY id DESC");
	$tripsInfo			= SqlResultArray($con,"SHOW FULL COLUMNS FROM $tripsTable", "Field");
	$participantsInfo	= SqlResultArray($con,"SHOW FULL COLUMNS FROM $participantsTable", "Field");
	$css				= ParseCss(file_get_contents("trips.css"));
	$updated			= "background-color:".$css[".updated"]["background-color"].";";
	$inserted			= "background-color:".$css[".inserted"]["background-color"].";";
	$deleted			= "color:".$css[".deleted"]["color"].";";
	$border				= "border: solid 1px black; border-collapse: collapse;";
	$ignore				= ['id','approval','isDeleted','isSocial','isNoSignup','mapRoute','isLimited','lastEmailChangeId','tripId','memberId','displayPriority','historyId','legacyTripId','legacyEventId'];
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
		$val = GetTripHtmlValue($col,$trip,"Yes","No");

		if (in_array( $field, $ignore) || preg_match('/.*Id$/',$field) || $val === '')  {
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
		if (!in_array( $field, $ignore)) {
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
			$subject = Coalesce($subject, "RE: $trip[title] on $trip[tripDate] has just been $approval");
			$notes []= "<li>This trip has just been <b>$approval</b> by <b>$changedby</b></li>";
		} else {
			$subject = Coalesce($subject, "RE: $trip[title] on $trip[tripDate] has changed from $oldApproval to $approval");
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
		} else if ($classification == 'removed' && !$participants[$index-1]['isDeleted']) {
			$detail .= "<tr><td colspan='100' style='$border $deleted'>Deleted</td></tr>\n";
		}

		$participantChanges = false;
		$isUpdated = $isNew || $participant['index'] !== $oldParticipants[$id]['index'];
		$style = ($isDeleted ? $deleted : "").($isCreated ? $inserted : ($isUpdated ? $updated :""));
		$detail .= "<tr><td style='$border $style'>".($index+1)."</td>";
		foreach ($participantsInfo as $field => $col) {
			if (in_array( $field, $ignore )) {
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
			if (preg_match(ConfigServer::emailFilter, $participant["email"]))
				$email['recipients'] []= ['name'=>$participant['name'],'email'=>$participant['email']];
			else
				$email['filteredRecipients'] []= ['name'=>$participant['name'],'email'=>$participant['email']];
		}
	}

	$legend = "<tr><th>Legend: </th><td style='$border $updated'> Updates </td><td style='$border $inserted'> Additions </td></tr>";
	$email['html'] = 	
		$message.
		(count($notes) == 0 ? "" : "<h3>Please note:</h3>\n<ul>".implode("\n",$notes)."</ul>\n").
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
	$email['subject'] = Coalesce($subject,"RE: $trip[title] on $trip[tripDate]");

	return $email;
}

function ImportLegacyTrips($con, $truncate)
{
	$membersTable      = ConfigServer::membersTable;
	$membershipsTable  = ConfigServer::membershipsTable;
	$tripsTable		   = ConfigServer::tripsTable;
	$participantsTable = ConfigServer::participantsTable;
	$historyTable      = ConfigServer::historyTable;
	$logTable          = ConfigServer::logTable;
	$editTable         = ConfigServer::editTable;

	if ($truncate) {
		SqlExecOrDie($con,"TRUNCATE $tripsTable");
		SqlExecOrDie($con,"TRUNCATE $participantsTable");
		SqlExecOrDie($con,"TRUNCATE $historyTable");
		SqlExecOrDie($con,"TRUNCATE $logTable");
		SqlExecOrDie($con,"TRUNCATE $editTable");
	}

	$before = SqlResultArray($con,"SELECT coalesce((SELECT max(id) FROM $tripsTable),0) AS maxid,
										  		   (SELECT count(*) FROM $tripsTable) AS trips,
								   		  		   (SELECT count(*) FROM $participantsTable) AS participants")[0];

	$trips1 = SqlExecOrDie($con,
		"INSERT $tripsTable(legacyTripid, legacyEventid, isDeleted, isApproved, isSocial, 
								title, openDate, closeDate, tripDate, 
								length, departurePoint, cost, grade, maxParticipants, 
								description, logisticInfo, mapHtml)
		SELECT t.id, e.id, t.isRemoved, 1, e.type = 'Social',
				coalesce(t.title,e.title), CURDATE(), t.closeDate, t.date, 
				CASE WHEN t.length like 'Day' THEN 1
					WHEN t.length like 'am' THEN 1
					WHEN t.length like 'Easter%' THEN 4
					WHEN t.length like 'Weekend%' THEN 2
					WHEN t.length like '2%' THEN 2
					WHEN t.length like '3%' THEN 3
					WHEN t.length like '4%' THEN 4
					WHEN t.length like '11' THEN 11
					ELSE e.tripLength END,
				coalesce(t.departurePoint,e.departurePoint),
				coalesce(t.cost,e.cost),
				coalesce(t.grade,e.grade),
				t.maxParticipants,
				CASE WHEN t.isAdHoc THEN t.status ELSE e.text   END,
				CASE WHEN t.isAdHoc THEN ''       ELSE t.status END,
				t.mapHtml
		FROM trip.trips AS t
		LEFT JOIN newsletter.events AS e ON e.id = t.eventid
		WHERE t.id NOT IN (SELECT legacyTripId from $tripsTable WHERE legacyTripId IS NOT NULL)");
	$participants1 = SqlExecOrDie($con,
		"INSERT $participantsTable(tripId,memberId,name,email,phone,
									isDeleted,isLeader,isPlbProvider,isVehicleProvider,
									vehicleRego,logisticInfo,displayPriority,
									emergencyContactName,emergencyContactPhone)
		SELECT t.id, p.memberid,
					CASE coalesce(p.name,'') WHEN '' THEN concat(trim(m.firstname),' ',trim(m.lastname)) ELSE p.name END,
					CASE coalesce(p.email,'') WHEN '' THEN m.primaryemail ELSE p.name END,
					CASE coalesce(p.phone,'') WHEN '' THEN 
						coalesce((CASE m.mobilephone WHEN '' THEN null ELSE m.mobilephone END),
								(CASE ms.homephone WHEN '' THEN null ELSE ms.homephone END),
								(CASE m.workphone WHEN '' THEN null ELSE m.workphone END)) ELSE p.phone END,
					p.isRemoved, p.isLeader, p.isPLBProvider, p.isVehicleProvider,
					p.vehicleRego, p.status, p.displayPriority, 
					coalesce(m.emergencyContactName,''), coalesce(m.emergencyContactPhone,'')
		FROM $tripsTable            AS t
		JOIN trip.participants       AS p  ON p.tripId = t.legacyTripId
		LEFT JOIN $membersTable     AS m  ON m.id = p.memberid
		LEFT JOIN $membershipsTable AS ms ON ms.id = m.membershipid
		WHERE t.id NOT IN (SELECT DISTINCT tripId from $participantsTable)
		ORDER BY p.id");
	$trips2 = SqlExecOrDie($con,
		"INSERT $tripsTable(legacyEventId, isSocial,
								title, openDate, closeDate, tripDate, 
								length, departurePoint, cost, grade, description)
		SELECT e.id, e.type = 'Social', e.title, e.date, e.date, e.date, 
					e.tripLength, e.departurePoint, e.cost, e.grade, e.text
		FROM newsletter.events e
		WHERE e.id NOT IN (SELECT legacyEventId from $tripsTable WHERE legacyEventId IS NOT NULL)");
	$participants2 = SqlExecOrDie($con,
		"INSERT $participantsTable(tripId,memberId,isLeader,name,email,phone,
									emergencyContactName,emergencyContactPhone)
		SELECT t.id, m.id, 1,
				e.leader,e.leaderEmail,e.leaderPhone,
				coalesce(m.emergencyContactName,''),coalesce(m.emergencyContactPhone,'')
		FROM $tripsTable       AS t
		JOIN newsletter.events 	AS e ON e.id = t.legacyEventId
		JOIN $membersTable     AS m ON concat(trim(m.firstname),' ',trim(m.lastname)) = e.leader
		WHERE t.id NOT IN (SELECT DISTINCT tripId from $participantsTable)
		ORDER BY e.id");
	SqlExecOrDie($con,
		"INSERT $historyTable(`tripid`,`timestamp`,`action`,`table`)
		SELECT id,UTC_TIMESTAMP(),'import','$tripsTable'
		FROM $tripsTable
		WHERE id > $before[maxid];");
	SqlExecOrDie($con,
		"UPDATE $tripsTable
		SET historyId = (SELECT max(id) FROM $historyTable h WHERE h.tripId = trips.id)
		WHERE id > $before[maxid];");

	return array(	"truncated"=>$truncate,
					"before"=>$before,
					"mid"=>array("trips"=>$trips1,"participants"=>$participants1),
				   	"after"=>array("trips"=>$trips2,"participants"=>$participants2));
}

?>