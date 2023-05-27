<?php
function PastTrips(mysqli $con, int $userId, array $query): array
{
    $tripsTable         = ConfigServer::tripsTable;
    $participantsTable  = ConfigServer::participantsTable;
    $historyTable       = ConfigServer::historyTable;
    $membersTable       = ConfigServer::membersTable;
    $database           = explode('.', $tripsTable)[0];
    $from               = SqlVal($con, strval($query['from']));
    $to                 = SqlVal($con, strval($query['to']));
    $limit              = intval($query['limit'] ?? 100);
    $where              = ["t.tripDate BETWEEN $from AND $to"];
    $deleted            = intval($query['deleted']);
    $member             = GetMembers($con, $userId, "id = $userId")[0];
    $memberMap          = $query['memberMap'];
    $cols = SqlResultArray($con, "SHOW COLUMNS FROM $tripsTable", "Field", true);
    $idxs = SqlResultArray($con, "SHOW INDEX FROM $tripsTable", "Column_name", true);
    $comp = [
        'LENGTH' => "(CASE WHEN isSocial THEN 0 ELSE length END)",
        'COST' => "$database.cost_sum(cost)",
        'MAPS' => "CONCAT(COALESCE(maps,''),COALESCE(logisticInfo,''))",
        'PARTICIPANTS' => "COALESCE((SELECT COUNT(*) 
                                          FROM $participantsTable p
                                          WHERE p.tripid = t.id AND NOT p.isDeleted),0)"
    ];

    foreach ($query as $key => $value) {
        $col = strtoupper($key);
        if (array_key_exists($col, $cols) || array_key_exists($col, $comp)) {
            if ($idxs[$col] && $idxs[$col]['Index_type'] === 'FULLTEXT') {
                $clause = ["(MATCH($col) AGAINST(" . SqlVal($con, $value) . "))"];
                $fulltext[] = "ranking_$key";
            } else {
                $expr = $comp[$col] ?? $col;

                if (array_key_exists('min', $value) && array_key_exists('max', $value)) {
                    $clause = ["($expr BETWEEN " . intval($value['min']) . " AND " . intval($value['max']) . ")"];
                } else {
                    $clause = [];
                    foreach ($value as $subvalue) {
                        $clause[] = "($expr RLIKE " . SqlVal($con, $subvalue) . ")";
                    }
                }

                if ($comp[$col]) {
                    $computed[] = "$expr AS computed_$key";
                }
            }

            $rankCols["ranking_$key"] = '(' . implode('+', $clause) . ')';
        }
    }

    if ($deleted) {
        $rankCols['ranking_deleted'] = '(CASE WHEN isDeleted THEN 1 ELSE 0.5 END)';
    } else {
        $where[] = 'NOT t.isDeleted';
    }

    // Exit now with just the trips in the date range if there are no of filters 
    if (!$rankCols && !$memberMap) return GetTrips($con, $userId, implode(' AND ', $where));

    if ($rankCols) {
        foreach ($rankCols as $key => $value) {
            $computed[] = "$value AS $key";
        }
        $filter = implode(' AND ', [...$where, '(' . implode(' OR ', $rankCols) . ')']);
        $columns = implode(',', $computed);
        $trips = SqlResultArray(
            $con,
            "SELECT t.id, t.tripDate, $columns FROM $tripsTable t WHERE $filter",
            "id"
        );
    }

    if ($memberMap) {
        // Sanitize the inputs
        foreach ($memberMap as $name => $value) {
            $name === $member['name'] || in_array($member['role'], ['Admin', 'Webmaster']) || die('disallowed');
            $memberList[] = SqlVal($con, $name);
        }
        $memberNames = implode(',', $memberList);
        $memberIds = implode(',', array_column(GetMembers($con, $userId, "name IN ($memberNames)"), 'id'));

        $filter = implode(' AND ', $where);
        $members = SqlResultArray(
            $con,
            "SELECT p.tripId,
                    t.tripDate,
                    p.name,
                    (CASE WHEN p.isLeader THEN 'Leader' ELSE 'Non-Leader' END) AS `role`
            FROM $participantsTable p
            JOIN $tripsTable        t   ON t.id = p.tripId
            WHERE $filter AND NOT p.isDeleted AND p.name in ($memberNames)
            
            UNION ALL
            
            SELECT  h.tripId,
                    t.tripDate,
                    concat(trim(m.firstname),' ',trim(m.lastname)) AS name,
                    'Editor' AS `role`
            FROM $historyTable      h
            JOIN $membersTable      m ON m.id = h.userId
            JOIN $tripsTable        t ON t.id = h.tripId
            WHERE $filter AND h.userId in ($memberIds)
            AND NOT (h.table = '$participantsTable' AND JSON_EXTRACT(h.after,'$.memberId') = h.userId)"
        );

        // Work out what trips have what members in what roles
        foreach ($members as $member) {
            $trips[$member['tripId']] ??= ['id' => $member['tripId'], 'tripDate' => $member['tripDate']];
            $memberInfo[$member['tripId']][$member['name']][$member['role']] = 0.5;
            $memberInfo[$member['tripId']][$member['name']]['Either'] = 0.5;
            if ($member['role'] === 'Editor') continue;
            $memberInfo[$member['tripId']][$member['name']]['Tramper'] = 0.5;
        }

        // Work out the rankings for each trip for each member
        foreach ($memberInfo as $tripId => $tripMembers) {
            foreach ($memberMap as $name => $role) {
                $trips[$tripId]['ranking_member'] += $tripMembers[$name][$role] ?? 0;
                $trips[$tripId]['ranking_member'] += $tripMembers[$name]['Either'] ?? 0;
            }
        }

        $rankCols['ranking_member'] = '0';
    }

    if (!$trips) return [];

    // Normalise the full text rankings, so that they are all between 0 and 1 
    $trips = array_values($trips);
    foreach ($rankCols as $key => $value) {
        $max = in_array($key, $fulltext) ? max(0.01, max(array_column($trips, $key))) : 1;
        foreach ($trips as &$trip) {
            $trip[$key] = ($trip[$key] ?? 0) / $max;
            $trip['ranking'] += $trip[$key];
        }
    }

    // Sort and limit the trips, by ranking (descending) then date (ascending)
    array_multisort(
        array_column($trips, 'ranking'),
        SORT_DESC,
        SORT_NUMERIC,
        array_column($trips, 'tripDate'),
        SORT_ASC,
        SORT_STRING,
        $trips
    );
    $trips = array_slice($trips, 0, $limit);
    $trips = array_combine(array_column($trips, 'id'), $trips);

    // Merge in the details
    $details = GetTrips($con, $userId, 't.id in (' . implode(',', array_keys($trips)) . ')');
    foreach ($details as $detail) {
        $trips[$detail['id']] = array_merge($detail, $trips[$detail['id']]);
    }

    return array_values($trips);
}
