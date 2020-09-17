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
			   WHEN CURDATE() < closeDate	THEN $open
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

		if ($trip["isApproved"] 
			&& $trip["tripGroup"] < $suggested
			&& array_key_exists($trip["id"],$roles) && $roles[$trip["id"]]["role"] != "Removed") {
			$trip["role"] = $roles[$trip["id"]]["role"];
			$trip["tripGroup"] = $mytrips;
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
	$recipients = array();
	$email = GetTripHtml($con,$tripId,$subject,$message);
	$headers = "MIME-Version: 1.0\r\n".
			   "Content-type: text/html;charset=UTF-8\r\n".
			   "From: <noreply@ctc.org.nz>\r\n";
	   
   foreach ($email['recipients'] as $recipient) {

		if (!mail($recipient['email'], $email['subject'], $email['html'], $headers))
			die(Log($con,"ERROR","mail() failed $recipient[email], $email[subject], $email[html]"));
	}

	$emailJson = mysqli_real_escape_string($con,json_encode($email));
	$id = SqlExecOrDie($con, "INSERT $historyTable 
								SET	`tripId` = $tripId, 
								`userId` = $userId, 
								`action` = 'email', 
								`timestamp` = UTC_TIMESTAMP(),
								`after` = '$emailJson'", true);
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
		$email = SendEmail($con,$trip['id'],0);
		$trip['subject'] = $email['subject'];
		$trip['recipients'] = $email['recipients'];
		$trip['filteredRecipients'] = $email['filteredRecipients'];
	}

	return $trips;
}

function GetTripHtmlValue($col,$row) { 
	switch ($col["Type"]) {
		case "bit(1)":
			return $row[$col['Field']] ? "Yes" : ""; 
		case "date":
			return date('D j M Y', strtotime($row[$col['Field']]));
		default:
			return htmlentities($row[$col['Field']]);
	}
}

function GetTripHtml($con,$id,$subject=null,$message=null) {
	$tripsTable = ConfigServer::tripsTable;
	$participantsTable = ConfigServer::participantsTable;
	$historyTable = ConfigServer::historyTable;
	$trip				= GetTrips($con,'null',$id)[0];
	$participants		= SqlResultArray($con,"SELECT * 
											   FROM $participantsTable
											   WHERE tripId = $id
											   ORDER BY isDeleted, isLeader DESC, coalesce(displayPriority,id)");
	$changes    		= SqlResultArray($con,"SELECT concat(coalesce(participantId,0),',',coalesce(`column`,'new')) as `key`
											   FROM $historyTable 
											   WHERE id IN (
												   SELECT MIN(id) 
												   FROM $historyTable 
												   WHERE tripId = $id and id > $trip[historyId]
												   GROUP BY coalesce(participantId,0))", "key");
	$tripsInfo			= SqlResultArray($con,"SHOW FULL COLUMNS FROM $tripsTable", "Field");
	$participantsInfo	= SqlResultArray($con,"SHOW FULL COLUMNS FROM $participantsTable", "Field");
	$css				= ParseCss(file_get_contents("trips.css"));
	$updated			= "background-color:".$css[".updated"]["background-color"].";";
	$inserted			= "background-color:".$css[".inserted"]["background-color"].";";
	$deleted			= "color:".$css[".deleted"]["color"].";";
	$border				= "border: solid 1px black; border-collapse: collapse;";
	$ignore				= array('id','isDeleted','isApproved','mapHtml','lastEmailChangeId','tripId','memberId','displayPriority');
	$subject 			= $subject == null ? "RE: ".$trip["title"]." on ".$trip["tripDate"] : $subject;
	$message			= $message == null ? "" : "<p>".htmlentities($message)."</p>";
	$email				= array("subject"=>$subject, "recipients"=>array(), "filteredRecipients"=>array());
	$tripChanges        = false;

	$header	= "";
	foreach ($tripsInfo as $field => $col) {
		$val = GetTripHtmlValue($col,$trip);
		if (!in_array( $field, $ignore) && !preg_match('/.*Id$/',$field) && $val != '') {
			$style = $border.(array_key_exists("0,$field",$changes) ? $updated : "");
			$header .= 
				"<tr>
					<th style='$style'>".htmlentities($col['Comment'])."</th>
					<td style='$style'>$val</td>
				</tr>";
			$tripChanges = $tripChanges || array_key_exists("0,$field",$changes);
		}
	}

	$detail = "<tr><th>&nbsp;</th>";
	foreach ($participantsInfo as $field => $col) {
		if (!in_array( $field, $ignore))
			$detail .= "<th style='$border'>".htmlentities($col['Comment'])."</th>";
	}
	$detail .= "</tr>";

	foreach ($participants as $index => $participant) {
		$id = $participant['id'];
		$isNew = array_key_exists("$id,new",$changes); 
		$isDeleted = $participant['isDeleted'];
		if (!$isDeleted && $index && $index == $trip['maxParticipants'])
			$detail .= "<tr><td colspan='100' style='$border $deleted'>Waitlist</td></tr>";
		else if ($isDeleted && $index && !$participants[$index-1]['isDeleted'])
			$detail .= "<tr><td colspan='100' style='$border $deleted'>Deleted</td></tr>";

		$participantChanges = false;
		$isUpdated = array_key_exists("$id,displayPriority",$changes); 
		$style = ($isDeleted ? $deleted : "").($isNew ? $inserted : ($isUpdated ? $updated :""));
		$detail .= "<tr><td style='$border $style'>".($index+1)."</td>";
		foreach ($participantsInfo as $field => $col) {
			if (!in_array( $field, $ignore )) {
				$isUpdated = array_key_exists("$id,$field",$changes); 
				$style = ($isDeleted ? $deleted : "").($isNew ? $inserted : ($isUpdated ? $updated :""));
				$participantChanges = $participantChanges || $isNew || $isUpdated;
				$detail .= "<td style='$border $style'>".GetTripHtmlValue($col,$participant)."</td>";
			}
		}
		$detail .= "</tr>";

		if ($message != '' || $tripChanges || $participantChanges || ($participant['isLeader'] && count($changes))) {
			if (preg_match(ConfigServer::emailFilter, $participant["email"]))
				$email['recipients'] []= array('name'=>$participant['name'],'email'=>$participant['email']);
			else
				$email['filteredRecipients'] []= array('name'=>$participant['name'],'email'=>$participant['email']);
		}
	}

	$legend = "<tr><th>Legend: </th><td style='$border $updated'> Updates </td><td style='$border $inserted'> Additions </td></tr>";
	$email['html'] = 	"$message".
						"<h3>Current trip details:</h3>".
						"<table style='$border'>$header</table>".
						"<table style='$border'>$detail</table>".
						"<table style='$border'>$legend</table>";
	$email['messageId'] = MakeGuid();
	$email['originalMessageId'] = MakeGuid();

	if (ConfigServer::emailHasDebugInfo)
	 	$email['html'] .= PrettyPrintJson($changes);

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