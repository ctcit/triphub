<?php

function GetMembers($con, $userid, $id = 0) {
	$editor_roles       = ConfigServer::editor_roles;
	$members_table      = ConfigServer::members_table;
	$memberships_table  = ConfigServer::memberships_table;
	$roles_table        = ConfigServer::roles_table;
	$member_roles_table = ConfigServer::member_roles_table;
	$trips_table		= ConfigServer::trips_table;
	$participants_table = ConfigServer::participants_table;
	$where			    = $id === 0 ? "" : "WHERE id = $id";

	return SqlResultArray($con,
		"SELECT * 
		FROM
			(SELECT	m.id,
				concat(trim(m.firstname),' ',trim(m.lastname)) as name,
				m.primaryemail as email,
				COALESCE(
					(CASE m.mobilephone WHEN '' THEN null ELSE m.mobilephone end),
					(CASE ms.homephone WHEN '' THEN null ELSE ms.homephone end),
					(CASE m.workphone WHEN '' THEN null ELSE m.workphone end)) as phone,
				concat(trim(m.emergencyContactName),' ',trim(m.emergencyContactPhone)) as emergency_contact,
				q.role,
				(case when m.id = $userid then 1 else 0 end) as is_me,
				1 as is_member
			FROM $members_table             m
			JOIN $memberships_table         ms  on ms.id = m.membershipid
			LEFT JOIN
				(SELECT mr.memberid, max(r.role) as role
				FROM	$member_roles_table  mr
				JOIN 	$roles_table        r   on r.id = mr.roleid and r.role in ($editor_roles)
				GROUP BY mr.memberid) 	   q   on q.memberid = m.id
			WHERE ms.statusAdmin = 'Active'
			UNION
			SELECT 
				0 as id,
				p.name,
				p.email,
				p.phone,
				p.emergency_contact,
				null as role,
				0 as is_me,
				0 as is_member			
			FROM 
				(SELECT max(p.id) as id
				FROM $participants_table p
				JOIN $trips_table 		t ON t.id = p.trip_id
				WHERE COALESCE(p.member_id,0) = 0 
				AND t.trip_date > DATE_ADD(now(),INTERVAL -180 DAY)
				GROUP BY p.name) 		q
			JOIN $participants_table 	p ON q.id = p.id) u
		$where
		ORDER by name");
}

?>