<?php

function GetMembers($con, $userid, $id = 0) {
	$editorRoles       = ConfigServer::editorRoles;
	$membersTable      = ConfigServer::membersTable;
	$membershipsTable  = ConfigServer::membershipsTable;
	$rolesTable        = ConfigServer::rolesTable;
	$memberrolesTable  = ConfigServer::memberrolesTable;
	$tripsTable		   = ConfigServer::tripsTable;
	$participantsTable = ConfigServer::participantsTable;
	$where			   = $id === 0 ? "" : "WHERE id = $id";

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
				role.role,
				(case when m.id = $userid then 1 else 0 end) as isMe,
				1 as isMember
			FROM $membersTable             m
			JOIN $membershipsTable         ms  on ms.id = m.membershipId
			LEFT JOIN
				(SELECT mr.memberid, max(r.role) as role
				FROM	$memberrolesTable  mr
				JOIN 	$rolesTable        r   on r.id = mr.roleid and r.role in ($editorRoles)
				GROUP BY mr.memberid) role     on role.memberId = m.id
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