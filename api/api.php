<?php

    define('_JEXEC', 1);
    require_once( 'utilities.php' );
    require('config.php');
    require('trips.php');
    require('members.php');
    require('newsletters.php');
    require('routes.php');
    require('destinations.php');
    require('mileage_rates.php');

    // Extract data from parameters
    $method = $_SERVER['REQUEST_METHOD'];

    if (date("Ymd") < ConfigServer::apiKeyExpiry) {
        header("Access-Control-Allow-Origin: *");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Api-Key, content-type');
        header('Access-Control-Max-Age: 86400');    // cache for 1 day
    }

    if ($method == "OPTIONS") {
        if (date("Ymd") < ConfigServer::apiKeyExpiry) {
            header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE');
        }
    } else {
        $request = explode('/', trim($_SERVER['PATH_INFO'],'/'));
        $entity = sizeof($request) ? preg_replace('/[^a-z0-9_]/i','',array_shift($request)) : false;
        $id = sizeof($request) && intval($request[0]) ? intval(array_shift($request)) : 0;
        $subEntity = sizeof($request) ? preg_replace('/[^a-z0-9_]/i','',array_shift($request)) : false;
        $subId = sizeof($request) && intval($request[0]) ? intval(array_shift($request)) : 0;
        $input = json_decode(file_get_contents('php://input'),true);
        $basehref = "https://$_SERVER[HTTP_HOST]$_SERVER[SCRIPT_NAME]";
        $route = $method.($entity ? " $entity" : "").($id ? '/{'.rtrim($entity,'s').'Id}' : '')
                        .($subEntity ? "/$subEntity" : "").($subId ? '/{'.rtrim($subEntity,'s').'Id}' : '');
        $queryString = filter_input(INPUT_SERVER, "QUERY_STRING", FILTER_SANITIZE_STRING);
        parse_str(trim($_SERVER['QUERY_STRING']), $query);
        $result = ApiProcess($con,$basehref,$method,$route,$entity,$id,$subEntity,$subId,$input,$query);

        if (gettype($result) == 'string') {
            header('Content-Type: text/html');
            echo $result;
        } else {
            if (array_key_exists("prettyprintjson", $_GET) && intval($_GET["prettyprintjson"])) {
                header('Content-Type: text/html');
                echo PrettyPrintJson($result);
            } else {
                header('Content-Type: application/json');
                echo json_encode($result);
            }
        }
    }

    mysqli_close($con);

function ApiProcess($con,$basehref,$method,$route,$entity,$id,$subEntity,$subId,$input,$query){

	$table = TableFromEntity($entity);
    $subTable = TableFromEntity($subEntity);
    LogMessage($con,$method,"$route $entity $id $subEntity $subId ".json_encode($input));

    switch ($route) {
        case "GET":
            // DESCRIPTION Gets this API documentation
            // OUTPUT HTML
            return ApiHelp($con,$basehref);

        case "GET config":
            // DESCRIPTION Gets global configuration parameters
            // OUTPUT A single <a href='$basehref#config'>config</a> record
            return array((new ReflectionClass("ConfigClient"))->getConstants());

        case "GET members":
            // DESCRIPTION Gets members
            // OUTPUT Array of <a href='$basehref#members'>members</a>
            return GetMembers($con, UserIdIfHasRoleOrDie($con,"NonPrivileged"));

        case "GET members/{memberId}":
            // DESCRIPTION Gets member
            // OUTPUT Single <a href='$basehref#members'>members</a>
            return GetMembers($con, UserIdIfHasRoleOrDie($con,"NonPrivileged"), $id);

        case "GET trips":
            // DESCRIPTION Gets all trips whose close date is after the current date less one week
            // OUTPUT Array of <a href='$basehref#trips'>trips</a> + tripState + leaders
            return GetTrips($con, UserIdIfHasRoleOrDie($con,"NonPrivileged"));

        case "POST trips":
            // DESCRIPTION Creates a new trip
            // INPUT A <a href='$basehref#trips'>trip</a>
            // OUTPUT The new <a href='$basehref#trips'>trip</a>
            // INPUTENTITY trips
            return ApiPost($con,UserIdIfHasRoleOrDie($con,"TripLeader"),$table,$input,0);

        case "GET trips/{tripId}":
            // DESCRIPTION Gets detail for a given trip
            // OUTPUT <a href='$basehref#trips'>trips</a> + tripState + leaders + role + href
            return GetTrips($con,UserIdIfHasRoleOrDie($con,"NonPrivileged"),$id);

        case "POST trips/{tripId}":
        case "PATCH trips/{tripId}":
            // DESCRIPTION Updates trip detail for a given trip
            // INPUT <a href='$basehref#trips'>trips</a>
            // OUTPUT <a href='$basehref#trips'>trips</a>
            // INPUTENTITY trips
            return ApiPatch($con,UserIdIfHasRoleOrDie($con,"TripLeader"),$table,$id,$input,$id);

        case "DELETE trips/{tripId}":
            // DESCRIPTION Deletes the given trip
            // OUTPUT Confirmation string array
            UserIdIfHasRoleOrDie($con,"Webmaster");
            SqlExecOrDie($con,"DELETE FROM ".ConfigServer::participantsTable." WHERE tripid = $id");
            SqlExecOrDie($con,"DELETE FROM ".ConfigServer::historyTable." WHERE tripid = $id");
            SqlExecOrDie($con,"DELETE FROM ".ConfigServer::editTable." WHERE tripid = $id");
            SqlExecOrDie($con,"DELETE FROM ".ConfigServer::tripsTable." WHERE id = $id");
            return ["trip $id deleted"];

        case "GET trips/{tripId}/participants":
            // DESCRIPTION Get participants for a given trip
            // OUTPUT Array of <a href='$basehref#participants'>participants</a> + href
            UserIdIfHasRoleOrDie($con,"Member");
            return SqlResultArray($con,"SELECT * FROM $subTable WHERE tripId=$id ORDER BY id");

        case "GET trips/{tripId}/html":
            // DESCRIPTION Get trip detail and participants as HTML
            // OUTPUT HTML
            UserIdIfHasRoleOrDie($con,"Member");
            return GetTripHtml($con,$id)['html'];

        case "POST trips/{tripId}/participants":
            // DESCRIPTION Creates a participant for the given trip
            // INPUT <a href='$basehref#participants'>participants</a>
            // OUTPUT <a href='$basehref#participants'>participants</a> + href
            // INPUTENTITY participants
            $input["tripId"] = $id;
            return ApiPost($con,UserIdIfHasRoleOrDie($con,"Member"),$subTable,$input,$id);

        case "POST trips/{tripId}/edit":
            // DESCRIPTION Creates a new edit record for the given trip
            // INPUT <a href='$basehref#edit'>edit</a>
            // OUTPUT Array of all current <a href='$basehref#edit'>edits</a> for trip. The first is the one just created.
            // INPUTENTITY edit
            $input["tripId"] = $id;
            $input["userId"] = UserIdIfHasRoleOrDie($con,"Member");
            ApiPost($con,$input["userId"],$subTable,$input,$id);
            DeleteTripEdits($con);
            return SqlResultArray($con,"SELECT * from $subTable WHERE tripId = $id ORDER BY id DESC");

        case "GET trips/{tripId}/history":
            // DESCRIPTION Gets change history for a given trip
            // OUTPUT Array of <a href='$basehref#history'>history</a>
            UserIdIfHasRoleOrDie($con,"Member");
            return SqlResultArray($con,"SELECT * FROM $subTable WHERE tripId=$id ORDER BY id");

        case "POST trips/{tripId}/email":
            // DESCRIPTION Sends email to trip participants
            // INPUT <a href='$basehref#subjectbody'>subject + body</a>
            // OUTPUT Confirmation string
            // INPUTENTITY subjectbody
            UserIdIfHasRoleOrDie($con,"Member");
            SendTripEmail($con,$id,UserIdIfHasRoleOrDie($con,"Member"),$input['subject'],$input['body']);
            $input['result'] = "Email sent for trip $id";
            return $input;

        case "GET trips/{tripId}/participants/{participantId}":
            // DESCRIPTION Gets participants detail for a given trip
            // OUTPUT The <a href='$basehref#participants'>participant</a>
            UserIdIfHasRoleOrDie($con,"Member");
            return SqlResultArray($con,"SELECT * FROM $subTable WHERE id=$subId ORDER BY id")[0];

        case "POST trips/{tripId}/participants/{participantId}":
        case "PATCH trips/{tripId}/participants/{participantId}":
            // DESCRIPTION Updates participants detail for a given trip
            // INPUT A <a href='$basehref#participants'>participant</a>
            // OUTPUT The updated <a href='$basehref#participants'>participant</a>
            // INPUTENTITY participants
            return ApiPatch($con,UserIdIfHasRoleOrDie($con,"Member"),$subTable,$subId,$input,$id);

        case "POST trips/{tripId}/edit/{editId}":
        case "PATCH trips/{tripId}/edit/{editId}":
            // DESCRIPTION Maintains an edit record for the current user.
            // INPUT <a href='$basehref#edit'>edit</a> it's expected that the 'stamp' and 'isEdited' columns be updated by calls to this endpoint
            // OUTPUT Array of <a href='$basehref#edit'>edit</a>
            // OUTPUT Returns all the current edits associated with the same trip
            // INPUTENTITY edit
            ApiPatch($con,UserIdIfHasRoleOrDie($con,"Member"),$subTable,$subId,$input,$id);
            DeleteTripEdits($con);
            return SqlResultArray($con,"SELECT * from $subTable WHERE tripId = $id ORDER BY id DESC");

        case "POST trips/{tripId}/members/{memberId}":
        case "PATCH trips/{tripId}/members/{memberId}":
            // DESCRIPTION Sets emergency contact details for member
            // OUTPUT Single <a href='$basehref#members'>member</a>
            // INPUTENTITY members
            $userId = UserIdIfHasRoleOrDie($con,"Member");
            ApiPatch($con,$userId,$subTable,$subId,$input,$id);
            return GetMembers($con, $userId, $subId);

        case "DELETE trips/{tripId}/edit/{editId}":
            // DESCRIPTION Deletes the given edit record
            // OUTPUT Confirmation string
            UserIdIfHasRoleOrDie($con,"Webmaster");
            SqlExecOrDie($con,"DELETE FROM $subTable WHERE id = $subId");
            return Array("Edit $subId deleted");

        case "POST trips/emails":
            // DESCRIPTION Sends any necessary emails
            // OUTPUT Array of trip indentification details for any trips that had emails send
            UserIdIfHasRoleOrDie($con,"Member");
            return PostEmails($con);

        case "GET maps":
        case "GET public_holidays":
            // DESCRIPTION Gets map or public holiday resource
            // OUTPUT Array of <a href='$basehref#map'>map</a> or <a href='$basehref#holiday'>holiday</a>
            return json_decode(file_get_contents(str_replace('GET ','',$route).'.json'));

        case "GET map_picker_iframe":
            // DESCRIPTION Gets map picker html
            // OUTPUT Array of one string containing map_picker_iframe.html
            return Array(file_get_contents('map_picker_iframe.html'));

        case "POST importlegacytrips":
            // DESCRIPTION Imports legacy trips, specify 'TRUNCATE' in json to truncate tables
            // OUTPUT Counts of trips and participants affected
            // INPUTENTITY json
            UserIdIfHasRoleOrDie($con,"Webmaster");
            return ImportLegacyTrips($con, $input['json'] == 'TRUNCATE');

        case "GET newsletters":
            // DESCRIPTION Gets newsletters. Optional ?since=YYYY-MM-DD
            // OUTPUT Array of <a href='$basehref#newsletters'>newsletters</a>
            return GetNewsletters($con, UserIdIfHasRoleOrDie($con,"Admin"), 0, $query);

        case "GET newsletters/{newsletterId}":
            // DESCRIPTION Gets newsletter
            // OUTPUT Single <a href='$basehref#newsletters'>newsletters</a>
            return GetNewsletters($con, UserIdIfHasRoleOrDie($con,"Admin"), $id);

        case "POST newsletters":
            // DESCRIPTION Creates a new newsletter
            // INPUT A <a href='$basehref#newsletters'>newsletter</a>
            // OUTPUT The new <a href='$basehref#tripsnewsletters'>newsletter</a>
            // INPUTENTITY newsletters
            return ApiPost($con, UserIdIfHasRoleOrDie($con,"Admin"),$table,$input,0);

        case "POST newsletters/{newsletterId}":
        case "PATCH newsletters/{newsletterId}":
            // DESCRIPTION Updates detail for a given newsletter
            // INPUT <a href='$basehref#newsletters'>newsletters</a>
            // OUTPUT <a href='$basehref#newsletters'>newsletters</a>
            // INPUTENTITY newsletters
            return ApiPatch($con,UserIdIfHasRoleOrDie($con,"Admin"),$table,$id,$input,0);

        case "GET newsletters/current":
            // DESCRIPTION Gets current newsletter, if it exists
            // OUTPUT Single <a href='$basehref#newsletters'>newsletters</a>
            return GetCurrentNewsletter($con, UserIdIfHasRoleOrDie($con,"Admin"));

        case "GET newsletters/events":
            // DESCRIPTION Gets the list of trips to be included in the current newsletter
            // OUTPUT Single <a href='$basehref#newsletters'>newsletters</a>
            return GetEvents($con, UserIdIfHasRoleOrDie($con,"Admin"));

        case "GET newsletters/unpublishedEvents":
            // DESCRIPTION Gets the list of unpublished trips that won't be published in the current newsletter
            // (but are still current)
            // OUTPUT Single <a href='$basehref#newsletters'>newsletters</a>
            return GetEvents($con, UserIdIfHasRoleOrDie($con,"Admin"), true);

        case "POST newsletters/{newsletterId}/current":
            // DESCRIPTION Sets the specified newsletter as current (this will unset any existing current newsletter)
            // OUTPUT Confirmation string
            return SetCurrentNewsletter($con, UserIdIfHasRoleOrDie($con,"Admin"), $id);

        case "GET newsletters/latest":
            // DESCRIPTION Gets most recent newsletter
            // OUTPUT Single <a href='$basehref#newsletters'>newsletters</a>
            return GetLatestNewsletter($con, UserIdIfHasRoleOrDie($con,"Admin"));

        case "GET newsletters/volumes":
            // DESCRIPTION Gets available volumes
            // OUTPUT Single <a href='$basehref#newsletters'>newsletters</a>
            return GetNewsletterVolumes($con, UserIdIfHasRoleOrDie($con,"Admin"));

        case "GET newsletters/volumes/{volumeId}":
            // DESCRIPTION Gets all the newsletters of a specific volume
            // OUTPUT Single <a href='$basehref#newsletters'>newsletters</a>
            return GetNewsletterVolume($con, UserIdIfHasRoleOrDie($con,"Admin"), $subId);

        case "GET newsletters/{newsletterId}/tripreports":
            // DESCRIPTION Get the list of trip reports for a given newsletter
            // INPUT <a href='$basehref#newsletters/'>newsletters</a>
            // OUTPUT <a href='$basehref#newsletters'>newsletters</a>
            // INPUTENTITY newsletters
            return GetNewsletterTripReports($con,UserIdIfHasRoleOrDie($con,"Admin"),$id);

        case "POST newsletters/{newsletterId}/tripreports":
        case "PATCH newsletters/{newsletterId}/tripreports":
            // DESCRIPTION Update the list of trip reports for a given newsletter
            // INPUT <a href='$basehref#newsletters/'>newsletters</a>
            // OUTPUT <a href='$basehref#newsletters'>newsletters</a>
            // INPUTENTITY newsletters
            return PatchNewsletterTripReports($con,UserIdIfHasRoleOrDie($con,"Admin"),$id,$input);

        case "POST prettyprintjson":
            // DESCRIPTION Formats JSON
            // INPUT Raw JSON as a string
            // OUTPUT Formatted JSON
            // INPUTENTITY json
            return json_decode($input['json']);

        case "GET logondetails":
            // DESCRIPTION Get logon details
            // OUTPUT id, name and role of logged on user
            return GetLogonDetails($con,False);

        case "GET routes":
            return GetRoutes($con, UserIdIfHasRoleOrDie($con,"NonPrivileged"), $query);
        case "GET routes/{routeId}":
            return GetRoute($con, UserIdIfHasRoleOrDie($con,"NonPrivileged"), $id);
        case "POST routes":
            return ApiPost($con, UserIdIfHasRoleOrDie($con,"Admin"),$table,$input,0);
        case "DELETE routes/{routeId}":
            UserIdIfHasRoleOrDie($con,"Admin");
            SqlExecOrDie($con,"DELETE FROM $table WHERE id = $id");
            return Array("Route $id deleted");    
        case "PATCH routes/{routeId}":
            return ApiPatch($con,UserIdIfHasRoleOrDie($con,"Admin"),$table,$id,$input,0);
        case "GET routesroutearchive":
            return GetCtcRoutes($con, UserIdIfHasRoleOrDie($con,"NonPrivileged"));
        case "GET routesroutearchive/{routesroutearchiveId}":
            return GetCtcRoute($con, UserIdIfHasRoleOrDie($con,"NonPrivileged"), $id);
        case "GET routestripreports":
            return GetTripReportsRoutes($con, UserIdIfHasRoleOrDie($con,"NonPrivileged"));
        case "GET routestripreports/{routestripreportId}":
            return GetTripReportsRoute($con, UserIdIfHasRoleOrDie($con,"NonPrivileged"), $id);
        case "GET routestriphub":
            return GetTripHubRoutes($con, UserIdIfHasRoleOrDie($con,"NonPrivileged"));
        case "GET routestriphub/{routestriphubId}":
            return GetTripHubRoute($con, UserIdIfHasRoleOrDie($con,"NonPrivileged"), $id);

        case "GET notices":
            // DESCRIPTION Get newsletter notices. May specify a limit and offset as query paramenters
            // OUTPUT Array of <a href='$basehref#notices'>notices</a>
            return GetNotices($con, UserIdIfHasRoleOrDie($con,"Admin"), 0, $query);

        case "GET notices/current":
            // DESCRIPTION Get newsletter notices where the expiry date is after the current
            //             newsletter date (if there is no current newsletter won't return anything).
            // OUTPUT Array of <a href='$basehref#notices'>notices</a>
            return GetCurrentNotices($con, UserIdIfHasRoleOrDie($con,"Admin"), 0, $query);

        case "GET notices/expired":
            // DESCRIPTION Get expired newsletter notices. May specify a limit and offset as query paramenters
            // OUTPUT Array of <a href='$basehref#notices'>notices</a>
            return GetExpiredNotices($con, UserIdIfHasRoleOrDie($con,"Admin"), 0, $query);

        case "GET notices/{noticeId}":
            // DESCRIPTION Gets notice
            // OUTPUT Single <a href='$basehref#notices'>notice</a>
            return GetNewsletters($con, UserIdIfHasRoleOrDie($con,"Admin"), $id);

        case "POST notices":
            // DESCRIPTION Creates a new notice
            // INPUT A <a href='$basehref#notices'>notice</a>
            // OUTPUT The new <a href='$basehref#notices'>notice</a>
            // INPUTENTITY notices
            return ApiPost($con, UserIdIfHasRoleOrDie($con,"Admin"),$table,$input,0);

        case "POST notices/{noticeId}":
        case "PATCH notices/{noticeId}":
            // DESCRIPTION Updates detail for a given notice
            // INPUT <a href='$basehref#notices'>notice</a>
            // OUTPUT <a href='$basehref#notices'>notice</a>
            // INPUTENTITY notices
            return GetNewsletters($con,UserIdIfHasRoleOrDie($con,"Admin"),$table,$id,$input,0);

        case "GET destinations":
            // DESCRIPTION Gets all destinations
            // OUTPUT Array of <a href='$basehref#destinations'>destinations</a>
            return GetDestinations($con, UserIdIfHasRoleOrDie($con,"NonPrivileged"));

        case "GET mileage_rates":
            // DESCRIPTION Gets all mileage rates
            // OUTPUT Array of <a href='$basehref#mileage_rates'>mileage_rates</a>
            return GetMileageRates($con, UserIdIfHasRoleOrDie($con,"NonPrivileged"));

        default:
            http_response_code(400);
            die(LogMessage($con,"ERROR","$route not supported"));
            break;
    }
}

function TableFromEntity($entity) {
    $configServer = (new ReflectionClass("ConfigServer"))->getConstants();
    $key = $entity.'Table';
    if (array_key_exists($key, $configServer))
    {
        return $configServer[$key];
    }
    else
    {
        return null;
    }
}

// Specify a required role. If the current user has a role equal to or more
// privileged than that specified will return the user Id, otherwise will die
// and return a HTTP error code.
// Access levels are:
// * NonPrivileged
// * Member
// * TripLeader
// * Admin
// * Webmaster
function UserIdIfHasRoleOrDie($con, $requiredRole="NonPrivileged") {
    if ($_SERVER["HTTP_API_KEY"] != ConfigServer::apiKey) {
        // Not using an API key - get user logon details
        $member = GetLogonDetails($con, false);
    } else 
    if (date("Ymd") < ConfigServer::apiKeyExpiry) {
        // Using an API key and it hasn't expired
        $members = GetMembers($con, ConfigServer::apiKeyUserId, ConfigServer::apiKeyUserId);
        if (count($members) == 1)
        {
            $member = $members[0];
        }
        else
        {
            die("Error - GetMembers returned ".count($members));
        }
    } else {
        // Using an API key but expired
        http_response_code(401);
        die("API key expired");
    }

    $roles = array(
        "NonPrivileged" => 0,
        "Member" => 1,
        "TripLeader" => 2,
        "Admin" => 3,
        "Webmaster" => 4
    );

    if (!array_key_exists($requiredRole, $roles)) {
        die("Invalid role $requiredRole!");
    }
    $requiredRoleNum = $roles[$requiredRole];
    $userRoleNum = $roles[$member['role']];

    if ( $userRoleNum < $requiredRoleNum )
    {
        // User is not privilieged enough
        http_response_code(403);
        die("You do not have permission to access this function ($userRoleNum, $requiredRoleNum)");
    }

    return $member['id'];
}

function History($con,$userId,$action,$table,$before,$after,$tripId)
{
    switch ($table)
    {
        case ConfigServer::tripsTable:
            $participantId = "null";
            break;
        case ConfigServer::participantsTable:
            $participantId = $after["id"];
            break;
        case ConfigServer::membersTable:
            mail(ConfigServer::adminUpdateEmail,
                 "Updated emergency contacts for $after[firstName] $after[lastName]",
                 "From <b>$before[emergencyContactName]</b>, phone <b>$before[emergencyContactPhone]</b><br/>".
                 "To <b>$after[emergencyContactName]</b>, phone <b>$after[emergencyContactPhone]</b>",
                 "MIME-Version: 1.0\r\n".
                 "Content-type: text/html;charset=UTF-8\r\n".
                 "From: <noreply@ctc.org.nz>\r\n");
            $participantId = "null";
            break;
        default:
            return "not actioned table $table";
    }

    $historyTable = ConfigServer::historyTable;

    switch ($action)
    {
        case 'create':
            $afterSql = SqlVal($con,json_encode($after));
            $newid = SqlExecOrDie($con,
                "INSERT $historyTable
                SET `action` = '$action'
                ,   `table` = '$table'
                ,   `timestamp` = UTC_TIMESTAMP()
                ,   `userId` = $userId
                ,   `tripId` = $tripId
                ,   `participantId` = $participantId
                ,   `after` = $afterSql", true);
            return "$action $newid $tripId $table $afterSql";

        case 'update':
            foreach ($after as $col => $val) {
                $colSql = SqlVal($con,$col);
                $beforeSql = SqlVal($con,json_encode($before[$col]));
                $afterSql = SqlVal($con,json_encode($after[$col]));

                if ($beforeSql != $afterSql) {
                    $newid = SqlExecOrDie($con,
                        "INSERT $historyTable
                        SET `action` = '$action'
                        ,   `table` = '$table'
                        ,   `timestamp` = UTC_TIMESTAMP()
                        ,   `userId` = $userId
                        ,   `tripId` = $tripId
                        ,   `participantId` = $participantId
                        ,   `column` = $colSql
                        ,   `before` = $beforeSql
                        ,   `after` = $afterSql",true);
                }
            }
            return "$action $newid $tripId $table $afterSql";
    }

    return "nothing done";
}

function ApiPatch($con,$userId,$table,$id,$input,$tripId){
    $set = SqlSetFromInput($con, $input, $table);
    $sql = "UPDATE $table SET $set WHERE id=$id";
    $before = SqlResultArray($con,"SELECT * FROM $table WHERE id = $id");
    SqlExecOrDie($con,$sql);
    $after = SqlResultArray($con,"SELECT * FROM $table WHERE id = $id");
    History($con,$userId,"update",$table,$before[0],$after[0],$tripId);
    return $after;
}

function ApiPost($con,$userId,$table,$input,$tripId){
    $set = SqlSetFromInput($con, $input, $table);
    $sql = "INSERT $table SET $set";
    $id = SqlExecOrDie($con,$sql,true);
    $after = SqlResultArray($con,"SELECT * FROM $table WHERE id = $id");
    History($con,$userId,"create",$table,null,$after[0],Coalesce($tripId,$id));
    return $after;
}

function SqlSetFromInput($con,$input,$table){
    $set = array();
    $cols = SqlResultArray($con,"SHOW COLUMNS FROM $table","Field",true);

    foreach ($input as $col => $val) {

        if (!array_key_exists(strtoupper($col), $cols) || IsReadOnly($table,$col)) {
            continue;
        }

        $sqlcol = $cols[strtoupper($col)];

        if (strpos($sqlcol["Type"],"text") !== false ||
            strpos($sqlcol["Type"],"char") !== false ||
            strpos($sqlcol["Type"],"date") !== false ||
            strpos($sqlcol["Type"],"enum") !== false ) {
            $set []= "`$col`=".SqlVal($con,$val);
        } else if (strpos($sqlcol["Type"],"json") !== false) {
            $set []= "`$col`='".json_encode($val)."'";
        } else {
            $sqlval = floatval($val);
            $set []= "`$col`=$sqlval";
        }
    }

    return implode(",", $set);
}

function IsReadOnly($table, $col) {
    if ($table === ConfigServer::membersTable)
        return $col !== 'emergencyContactName' && $col !== 'emergencyContactPhone';
    else if ($table === ConfigServer::tripsTable ||
             $table === ConfigServer::participantsTable ||
             $table === ConfigServer::historyTable || 
             $table === ConfigServer::newslettersTable || 
             $table === ConfigServer::noticesTable || 
             $table === ConfigServer::editTable ||
             $table === ConfigServer::routesTable)
        return $col === 'id';
    else
        return true;
}

function ApiHelp($con,$basehref) {
    $html = "";
    $endpoints = array();
    $entities = array();
    $constants = (new ReflectionClass("ConfigServer"))->getConstants();
    $filehandle = fopen("api.php", "r") or die("Unable to open file!");
    $endpoint = Array('security'=>'NonPrivileged');

    // Parses this file to extract endpoint information
    while (!feof($filehandle)) {
        $line = str_replace('$basehref',$basehref,trim(fgets($filehandle)));
        if (preg_match('/case "(GET|POST|PATCH|DELETE)( (.*))?":/',$line,$matches)) {
            $endpoint['methods'] []= $matches[1];
            $endpoint['endpoint'] = $matches[3];
        } else if (preg_match('/\/\/ (DESCRIPTION|INPUT|OUTPUT|INPUTENTITY) (.*)/',$line,$matches)) {
            $endpoint[strtolower($matches[1])] .= "$matches[2]<br/>";
        } else if (preg_match('/UserIdIfHasRoleOrDie\(\$con,"(.*?)"\)/',$line,$matches)) {
            $endpoint["security"] = "$matches[1]";
        }

        if (preg_match('/return .*;/',$line,$matches) && array_key_exists('methods',$endpoint)) {
            $endpoints [] = $endpoint;
            $endpoint = Array('security'=>'NonPrivileged');
        }
    }
    fclose($filehandle);

    // Add data structure meta data for config and members, from API results
    foreach (array("config","members") as $entity) {
        $table = $constants[$entity."Table"];
        $data = ApiProcess($con,$basehref,"GET","GET $entity",$entity,null,null,null,null,null)[0];
        $cols = array();

        foreach ($data as $col => $val) {
            $cols []= array("col"=>$col,"type"=>gettype($val),"comment"=>$entity == "config" ? "Current value is $val" : "",
                            "readonly"=>IsReadOnly($table,$col) ? "Yes" : "");
        }
        $entities[$entity] = $cols;
    }

    // Add data structure meta data from tables meta data
    foreach (array("trips","participants","history","edit") as $entity) {
        $table = $constants[$entity."Table"];
        $sqlCols = SqlResultArray($con,"SHOW FULL COLUMNS FROM $table","Field");
        $cols = array();

        foreach ($sqlCols as $field => $col) {
            $cols []= array("col"=>$field,"type"=>$col["Type"],"comment"=>$col["Comment"] ? $col["Comment"] : "",
                            "readonly"=>IsReadOnly($table,$field) ? "Yes" : "");
        }
        $entities[$entity] = $cols;
    }

    // Add data structure we haven't managed to get from above
    $entities["subjectbody"] = array(array("col"=>"subject",  "type"=>"string","comment"=>"The email subject"),
                                     array("col"=>"body",     "type"=>"text",  "comment"=>"The email body"));
    $entities["json"] =        array(array("col"=>"json",     "type"=>"text",  "comment"=>"The json to format"));
    $entities["maps"] =        array(array("col"=>"coords",   "type"=>"json",  "comment"=>"The bounding box of the map"),
                                     array("col"=>"sheetCode","type"=>"text",  "comment"=>"The code of the map"),
                                     array("col"=>"name",     "type"=>"text",  "comment"=>"The name of the map"));
    $entities["holiday"] =     array(array("col"=>"date",     "type"=>"text",  "comment"=>"The date"),
                                     array("col"=>"name",     "type"=>"text",  "comment"=>"The name of the holiday"),
                                     array("col"=>"type",     "type"=>"text",  "comment"=>"The type of the holiday"),
                                     array("col"=>"details",  "type"=>"text",  "comment"=>"Details of the holiday"));

    $html .= "<style>
                body {font-family: arial;}
                table {border-collapse: collapse}
                td,th {border: solid 1px gray; vertical-align: top}
                .GET    {background: lightgreen; }
                .POST   {background: cyan;       }
                .PATCH  {background: plum;       }
                .DELETE {background: red;        }
            </style>";

    // Add endpoint information as HTML
    $apitest = str_replace('api.php','ApiTest.html',$basehref);
    $html .= "<table>";
    $html .= "<tr><th>Method</th><th>Endpoint</th><th>Security</th><th>Description</th><th>Input</th><th>Output</th></tr>";
    foreach ($endpoints as &$endpoint) {
        $endpoint['basehref'] = $basehref;
        $endpoint['fields'] = array_key_exists('inputentity',$endpoint) ? json_encode($entities[str_replace('<br/>','',$endpoint['inputentity'])]) : "[]";
        foreach ($endpoint['methods'] as $method) {
            $endpoint['method'] = $method;
            $endpoint['apitest'] .= "<div class='$method'>
                                        <a href='$apitest?".http_build_query($endpoint)."'>$method</a>
                                    </div>";
        }
        $html .= "<tr>
                    <th>$endpoint[apitest]</th>
                    <td>$endpoint[endpoint]</td>
                    <td>$endpoint[security]</td>
                    <td>$endpoint[description]</td>
                    <td>$endpoint[input]</td>
                    <td>$endpoint[output]</td>
                  </tr>";
    }
    $html .= "</table>";

    // Add data structure information as HTML
    foreach ($entities as $entity => $cols) {
        $html .= "<h2 id='$entity'>$entity</h2>";
        $html .= "<table><tr><th>Column</th><th>Type</th><th>Read only</th><th>Comments</th></tr>";
        foreach ($cols as $col)
            $html .= "<tr><td>$col[col]</td><td>$col[type]</td><td>$col[readonly]</td><td>$col[comment]</td></tr>";
        $html .= "</table>";
    }

    return $html;
}

?>
