<?php

function GetTrips($con,$user_id,$id = null) {
	$mytrips 			  = 0;
	$open 	  			= 1;
	$closed 			  = 2;
	$suggested 			= 3;
	$deleted 			  = 4;
	$currency_in_days	  = ConfigServer::currency_in_days;
	$trips_table          = ConfigServer::trips_table;		
	$participants_table   = ConfigServer::participants_table;		
	$change_history_table = ConfigServer::change_history_table;
	$members_table        = ConfigServer::members_table;
	$where = $id === null ? "t.trip_date > DATE_ADD(now(),INTERVAL -$currency_in_days DAY)" : "t.id = $id";

	$trips = SqlResultArray($con, 
	   "SELECT *,
	   		(CASE 
			   WHEN is_deleted = 1					THEN $deleted
			   WHEN is_approved = 0					THEN $suggested
			   WHEN CURDATE() < open_date 	THEN $suggested
			   WHEN CURDATE() < close_date	THEN $open
										   								ELSE $closed 
			END) 			as trip_state,
			'' 				as leaders,
			false			as is_open,
			0 				as participant_count,
			'' 				as `role`
	    FROM $trips_table t
			WHERE $where
			ORDER BY trip_date");

	$participants = SqlResultArray($con,
	   "SELECT	p.trip_id, 
				coalesce(p.name,concat(trim(m.firstname),' ',trim(m.lastname))) as name,
				is_leader
			FROM      $trips_table t 
			JOIN      $participants_table p ON p.trip_id = t.id and p.is_deleted = 0
			LEFT JOIN $members_table      m ON m.id = p.member_id
			WHERE $where");
	$roles = SqlResultArray($con,
	   "SELECT c.trip_id, 
	   			'Editor'  as role 
	    FROM $change_history_table c
			JOIN $trips_table          t on t.id = c.trip_id 
			WHERE $where AND c.user_id = $user_id  
			UNION
			SELECT p.trip_id, 
					(case when p.is_deleted then 'Removed' when p.is_leader then 'Leader' else 'Tramper' end) as role 
			FROM $participants_table p 
			JOIN $trips_table        t on t.id = p.trip_id 
			WHERE $where AND p.member_id = $user_id",
			"trip_id");
	
	foreach ($trips as &$trip) {
		$leaders = array();
		$participant_count = 0;

		foreach ($participants as &$participant) {
			if ($participant["trip_id"] == $trip["id"]) {
				$participant_count++;
				if ($participant["is_leader"] == "1")
					$leaders []= $participant["name"];
			}
		}

		$trip["leaders"] = implode(", ",$leaders);
		$trip["is_open"] = $trip["trip_state"] === $open;
		$trip["participant_count"] = $participant_count;

		if ($trip["is_approved"] && 
				$trip["trip_state"] < $suggested && 
				array_key_exists($trip["id"],$roles) && $roles[$trip["id"]]["role"] != "Removed") {
				$trip["role"] = $roles[$trip["id"]]["role"];
				$trip["trip_state"] = $mytrips;
		}
	}

	return $trips;
}

function DeleteTripEdits($con) {
	$expiry_age = ConfigClient::edit_refresh_in_sec * 10;
	$table = ConfigServer::edit_table;
	
	SqlExecOrDie($con, "DELETE FROM $table WHERE stamp < TIMESTAMPADD(second,-$expiry_age,UTC_TIMESTAMP())");
}

function SendEmail($con,$trip_id,$change_history_id,$user_id,$subject=null,$message=null) {

	$change_history_table = ConfigServer::change_history_table;
	$recipients = array();
	$email = GetTripHtml($con,$trip_id,$subject,$message);
	$headers = "MIME-Version: 1.0\r\n".
			   "Content-type: text/html;charset=UTF-8\r\n".
			   "From: <noreply@ctc.org.nz>\r\n";
	   
   foreach ($email['recipients'] as $recipient) {

		if (!mail($recipient['email'], $email['subject'], $email['html'], $headers))
			die("mail() failed $recipient[email], $email[subject], $email[html]");
	}

	$email_json = mysqli_real_escape_string($con,json_encode($email));
	if ($change_history_id) {
		SqlExecOrDie($con, "UPDATE $change_history_table 
							SET	`email` = '$email_json'
							WHERE id = $change_history_id");
	} else {
		SqlExecOrDie($con, "INSERT $change_history_table 
							SET	`trip_id` = $trip_id, 
									`user_id` = $user_id, 
									`action` = 'Email', 
									`timestamp` = UTC_TIMESTAMP(),
									`email` = '$email_json'");
	}

	return $email;
}

function PostEmails($con) {

	DeleteTripEdits($con);

	$trips_table = ConfigServer::trips_table;
	$change_history_table = ConfigServer::change_history_table;
	$edit_table = ConfigServer::edit_table;
	$trips = SqlResultArray($con, "SELECT t.id, t.title, t.trip_date, max(ch.id) as change_history_id
								   FROM $trips_table t
								   JOIN $change_history_table ch ON ch.trip_id = t.id 
								   LEFT JOIN $edit_table e on e.trip_id = t.id
								   WHERE e.id IS NULL
								   GROUP BY t.id, t.title, t.trip_date
								   HAVING (SELECT email FROM $change_history_table ech WHERE ech.id = max(ch.id)) IS NULL");

	foreach ($trips as &$trip) {
		$email = SendEmail($con,$trip['id'],$trip['change_history_id'],0);
		$trip['subject'] = $email['subject'];
		$trip['recipients'] = $email['recipients'];
		$trip['filtered_recipients'] = $email['filtered_recipients'];
	}

	return $trips;
}

function GetTripHtml($con,$id,$subject=null,$message=null)
{
	$trips_table = ConfigServer::trips_table;
	$participants_table = ConfigServer::participants_table;
	$change_history_table = ConfigServer::change_history_table;
	$trip				= GetTrips($con,'null',$id)[0];
	$last_email			= SqlResultArray($con,"SELECT coalesce(max(id),0) as id
												FROM $change_history_table 
												WHERE trip_id = $id AND email IS NOT NULL")[0]['id'];
	$participants		= SqlResultArray($con,"SELECT * 
											   FROM $participants_table
											   WHERE trip_id = $id
											   ORDER BY is_deleted, is_leader DESC, coalesce(display_priority,id)");
	$before_rows 		= SqlResultArray($con,"SELECT coalesce(participant_id,0) as `key`, `before`
											   FROM $change_history_table 
											   WHERE id IN (
												   SELECT MIN(id) 
												   FROM $change_history_table 
												   WHERE trip_id = $id and id > $last_email
												   GROUP BY coalesce(participant_id,0))", "key");
	$trips_info			= SqlResultArray($con,"SHOW FULL COLUMNS FROM $trips_table", "Field");
	$participants_info	= SqlResultArray($con,"SHOW FULL COLUMNS FROM $participants_table", "Field");
	$css				= ParseCss(file_get_contents("trips.css"));
	$updated			= "background-color:".$css[".updated"]["background-color"];
	$inserted			= "background-color:".$css[".inserted"]["background-color"];
	$deleted			= "color:".$css[".deleted"]["color"];
	$border				= "border: solid 1px black; border-collapse: collapse;";
	$ignore				= array('id','is_deleted','is_approved','map_html','last_email_change_id','trip_id','member_id','display_priority');
	$subject 			= $subject == null ? "RE: ".$trip["title"]." on ".$trip["trip_date"] : $subject;
	$message			= $message == null ? "" : "<p>".htmlentities($message)."</p>";
	$email				= array("subject"=>$subject,"recipients"=>array(),"filtered_recipients"=>array());

	foreach ($before_rows as &$row) {
		$row['before'] = $row['before'] ? json_decode($row['before'], true) : null;
	}

	$header	= "";
	$before	= array_key_exists( 0, $before_rows ) && $before_rows[0]['before'] != null ? $before_rows[0]['before'] : null;
	foreach ($trips_info as $field => $col) {
		if (!in_array( $field, $ignore)) {
			$style = $border.($before != null && $before[$field] != $trip[$field] ? $updated : "");
			$header .= 
				"<tr>
					<th style='$style'>".htmlentities($col['Comment'])."</th>
					<td style='$style'>".htmlentities($trip[$field])."</td>
				</tr>";
		}
	}
		
	$detail = "<tr><th>&nbsp;</th>";
	foreach ($participants_info as $field => $col) {
		if (!in_array( $field, $ignore))
			$detail .= "<th style='$border'>".htmlentities($col['Comment'])."</th>";
	}
	$detail .= "</tr>";

	$index = 0;
	foreach ($participants as $participant) {
		$is_deleted = $participant['is_deleted'] == '1';
		if (!$is_deleted && $index > 0 && $index == intval($trip['max_participants'])) {
			$detail .= '<tr><td colspan="100" style="$border $deleted">Waitlist</td></tr>';
		} else if ($is_deleted && ($index == 0 || $participants[$index-1]['is_deleted'] == '0')) {
			$detail .= '<tr><td colspan="100" style="$border $deleted">Deleted</td></tr>';
		}

		$id = $participant['id'];
		$index++;
		$before	= array_key_exists( $id, $before_rows ) ? $before_rows[$id]['before'] : null;
		$detail .= "<tr><td style='$border'>$index</td>";
		foreach ($participants_info as $field => $col) {
			if (!in_array( $field, $ignore )) {
				$style = $border.($before == null ? $inserted : (array_key_exists($field,$before) ? $updated :""))
								.($is_deleted ? $deleted : "");

				if ($col["Type"] == "bit(1)") {
					$detail .= "<td style='$style'>".($participant[$field] == "1" ? "Yes" : "")."</td>";
				} else {
					$detail .= "<td style='$style'>".htmlentities($participant[$field])."</td>";
				}
			}
		}
		$detail .= "</tr>";

		if ($message != '' || array_key_exists( 0, $before_rows ) || array_key_exists( $id, $before_rows )) {
			if (preg_match(ConfigServer::email_filter, $participant["email"]))
				$email['recipients'] []= array('name'=>$participant['name'],'email'=>$participant['email']);
			else
				$email['filtered_recipients'] []= array('name'=>$participant['name'],'email'=>$participant['email']);
		}
	}

	$legend = "<tr><th>Legend: </th><td style='$border $updated'> Updates </td><td style='$border $inserted'> Additions </td></tr>";
	$email['html'] = 	"$message
						<h3>Current trip details:</h3>
						<table style='$border'>$header</table><br/>
						<table style='$border'>$detail</table><br/>
						<table style='$border'>$legend</table>";

	if (ConfigServer::email_has_debug_info)
		$email['html'] .= "<pre>".PrettyPrintJson($before_rows,true)."</pre>
						   <pre>".PrettyPrintJson($email,true)."</pre>";

	return $email;
}

function MigrateLegacyTrips($con)
{
	$members_table      = ConfigServer::members_table;
	$memberships_table  = ConfigServer::memberships_table;
	$trips_table				= ConfigServer::trips_table;
	$participants_table = ConfigServer::participants_table;

	$before = SqlResultArray($con,"SELECT (SELECT count(*) FROM $trips_table) AS trips,
								   		  (SELECT count(*) FROM $participants_table) AS participants");

	$trips = SqlExecOrDie($con,
		"INSERT $trips_table(legacy_tripid, legacy_eventid, is_deleted, is_approved, is_social, 
								title, open_date, close_date, trip_date, 
								length, departure_point, cost, grade, max_participants, 
								description, logistic_info, map_html)
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
		WHERE t.id NOT IN (SELECT legacy_tripid from $trips_table WHERE legacy_tripid IS NOT NULL)");
	$participants = SqlExecOrDie($con,
		"INSERT $participants_table(trip_id,member_id,name,email,phone,
									is_deleted,is_leader,is_plb_provider,is_vehicle_provider,
									vehicle_rego,logistic_info,display_priority,emergency_contact)
		SELECT t.id, p.memberid,
					CASE coalesce(p.name,'') WHEN '' THEN concat(trim(m.firstname),' ',trim(m.lastname)) ELSE p.name END,
					CASE coalesce(p.email,'') WHEN '' THEN m.primaryemail ELSE p.name END,
					CASE coalesce(p.phone,'') WHEN '' THEN 
						coalesce((CASE m.mobilephone WHEN '' THEN null ELSE m.mobilephone END),
								(CASE ms.homephone WHEN '' THEN null ELSE ms.homephone END),
								(CASE m.workphone WHEN '' THEN null ELSE m.workphone END)) ELSE p.phone END,
					p.isRemoved,p.isLeader, p.isPLBProvider, p.isVehicleProvider,
					p.vehicleRego, p.status, p.displayPriority, 
					coalesce(concat(trim(m.emergencyContactName),' ',trim(m.emergencyContactPhone)),'')
		FROM $trips_table            AS t
		JOIN trip.participants       AS p  ON p.tripId = t.legacy_tripid
		LEFT JOIN $members_table     AS m  ON m.id = p.memberid
		LEFT JOIN $memberships_table AS ms ON ms.id = m.membershipid
		WHERE t.id NOT IN (SELECT DISTINCT trip_id from $participants_table)
		ORDER BY p.id");
	$mid = SqlResultArray($con,"SELECT (SELECT count(*) FROM $trips_table) AS trips,
									   (SELECT count(*) FROM $participants_table) AS participants");
	$trips = SqlExecOrDie($con,
		"INSERT $trips_table(legacy_eventid, is_social,
								title, open_date, close_date, trip_date, 
								length, departure_point, cost, grade, description)
		SELECT e.id, e.type = 'Social', e.title, e.date, e.date, e.date, 
					e.tripLength, e.departurePoint, e.cost, e.grade, e.text
		FROM newsletter.events e
		WHERE e.id NOT IN (SELECT legacy_eventid from $trips_table WHERE legacy_eventid IS NOT NULL)");
	$participants = SqlExecOrDie($con,
		"INSERT $participants_table(trip_id,member_id,is_leader,name,email,phone,emergency_contact)
		SELECT t.id, m.id, 1,
				e.leader,e.leaderEmail,e.leaderPhone,
				coalesce(concat(trim(m.emergencyContactName),' ',trim(m.emergencyContactPhone)),'')
		FROM $trips_table       AS t
		JOIN newsletter.events 	AS e ON e.id = t.legacy_eventid
		JOIN $members_table     AS m ON concat(trim(m.firstname),' ',trim(m.lastname)) = e.leader
		WHERE t.id NOT IN (SELECT DISTINCT trip_id from $participants_table)
		ORDER BY e.id");

	$after = SqlResultArray($con,"SELECT (SELECT count(*) FROM $trips_table) AS trips,
								  (SELECT count(*) FROM $participants_table) AS participants");
	return array( "before"=>$before,"mid"=>$mid,"after"=>$after);
}

?>