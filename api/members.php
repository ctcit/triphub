<?php

function GetMembers(mysqli $con, int $userid, string $where = 'true') {
	$newMembersRepView  = ConfigServer::newMembersRepView;
	$membersTable      = ConfigServer::membersTable;
	$membershipsTable  = ConfigServer::membershipsTable;
	$memberRolesTable  = ConfigServer::memberRolesTable;
	$membershipTypesTable = ConfigServer::membershipTypesTable;
	$tripsTable		   = ConfigServer::tripsTable;
	$participantsTable = ConfigServer::participantsTable;

	if ($userid == 0) {
		return SqlResultArray($con, "SELECT * FROM $newMembersRepView");
	}

	return array_values(SqlResultArray($con, 
		"SELECT * 
		FROM
			(SELECT	
				m.id,
				concat(trim(m.firstname),' ',trim(m.lastname)) as name,
				m.primaryemail as email,
				COALESCE(
					(CASE m.mobilephone WHEN '' THEN null ELSE m.mobilephone end),
					(CASE ms.homephone WHEN '' THEN null ELSE ms.homephone end),
					(CASE m.workphone WHEN '' THEN null ELSE m.workphone end)) as phone,
				m.emergencyContactName,
				m.emergencyContactPhone,
				mr.role AS role,
				mt.membershipTypeEnum AS membershipType,
				(CASE WHEN m.id = $userid THEN 1 ELSE 0 END) AS isMe,
				1 AS isMember
			FROM $membersTable             m
			JOIN $membershipsTable         ms  on ms.id = m.membershipId
			JOIN $memberRolesTable         mr  on mr.memberId = m.id
			JOIN $membershipTypesTable     mt  on ms.membershipTypeId	 = mt.id
			WHERE ms.statusAdmin = 'Active' AND ms.membershipTypeId NOT IN (9,10)
			
			UNION ALL
			
			SELECT 
				0 as id,
				p.name,
				p.email,
				p.phone,
				p.emergencyContactName,
				p.emergencyContactPhone,
				'NonMember' as role,
				'NonMember' AS membershipType,
				0 as isMe,
				0 as isMember
			FROM 
				(SELECT max(p.id) as id
				FROM $participantsTable p
				JOIN $tripsTable 		t ON t.id = p.tripId
				WHERE COALESCE(p.memberId,0) = 0 
				AND t.tripDate > DATE_ADD(now(),INTERVAL -180 DAY)
				GROUP BY p.name) 		nonmember
			JOIN $participantsTable 	p ON nonmember.id = p.id) u
		WHERE $where
		ORDER by name, id","name"));
}

?>
