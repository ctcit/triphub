<?php

function GetMembers($con, $userid, $id = 0) {
	$editorRoles       = ConfigServer::editorRoles;
	$newMemberRoles    = ConfigServer::newMemberRoles;
	$membersTable      = ConfigServer::membersTable;
	$membershipsTable  = ConfigServer::membershipsTable;
	$rolesTable        = ConfigServer::rolesTable;
	$memberrolesTable  = ConfigServer::memberrolesTable;
	$tripsTable		   = ConfigServer::tripsTable;
	$participantsTable = ConfigServer::participantsTable;
	$where			   = $id === 0 ? "" : "WHERE id = $id";

	if ($userid == 0)
		return SqlResultArray($con,
			"SELECT
				m.id,
				concat(trim(m.firstname),' ',trim(m.lastname)) as name,
				r.role,
				0 AS isMe,
				1 AS isMember
			FROM $membersTable      m
			JOIN $memberrolesTable  mr ON mr.memberId = m.id
			JOIN $rolesTable        r  ON r.id = mr.roleid
			WHERE r.role IN ($newMemberRoles)");

	return SqlResultArray($con,
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
				(SELECT r.role
				 FROM	$memberrolesTable  mr
				 JOIN 	$rolesTable        r   on r.id = mr.roleid and r.role in ($editorRoles) 
				 WHERE  mr.memberId = m.id
				 LIMIT 1) AS role,
				(CASE WHEN m.id = $userid THEN 1 ELSE 0 END) AS isMe,
				1 AS isMember
			FROM $membersTable             m
			JOIN $membershipsTable         ms  on ms.id = m.membershipId
			WHERE ms.statusAdmin = 'Active'
			UNION
			SELECT 
				0 as id,
				p.name,
				p.email,
				p.phone,
				p.emergencyContactName,
				p.emergencyContactPhone,
				null as role,
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
		$where
		ORDER by name");
}

?>