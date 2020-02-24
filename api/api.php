<?php

    define('_JEXEC', 1);
    require_once( 'alastair.php' );
    require('config.php');
    require('trips.php');
    require('members.php');
    require('newsletters.php');

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
            if (intval($_GET["prettyprintjson"])) {
                header('Content-Type: text/html');
                echo PrettyPrintJson($result);
            } else {
                header('Content-Type: application/json');
                echo json_encode($result);
            }
        }
    }

    mysqli_close($con);

function ApiProcess($con,$baseHref,$method,$route,$entity,$id,$subEntity,$subId,$input,$query){
  
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
            return GetMembers($con, AccessLevel($con,"Unsecured"));

        case "GET members/{memberId}":
            // DESCRIPTION Gets member
            // OUTPUT Single <a href='$basehref#members'>members</a>
            return GetMembers($con, AccessLevel($con,"Unsecured"), $id);

        case "GET trips":
            // DESCRIPTION Gets all trips whose close date is after the current date less one week
            // OUTPUT Array of <a href='$basehref#trips'>trips</a> + tripState + leaders
            return GetTrips($con, AccessLevel($con,"Unsecured"));
        
        case "POST trips":
            // DESCRIPTION Creates a new trip
            // INPUT A <a href='$basehref#trips'>trip</a>
            // OUTPUT The new <a href='$basehref#trips'>trip</a>
            // INPUTENTITY trips
            return ApiPost($con,AccessLevel($con,"Secured"),$table,$input,0);
            
        case "GET trips/{tripId}":
            // DESCRIPTION Gets detail for a given trip
            // OUTPUT <a href='$basehref#trips'>trips</a> + tripState + leaders + role + href
            return GetTrips($con,AccessLevel($con,"Unsecured"),$id);
        
        case "POST trips/{tripId}":
        case "PATCH trips/{tripId}":
            // DESCRIPTION Updates trip detail for a given trip
            // INPUT <a href='$basehref#trips'>trips</a>
            // OUTPUT <a href='$basehref#trips'>trips</a>
            // INPUTENTITY trips
            return ApiPatch($con,AccessLevel($con,"Secured"),$table,$id,$input,$id);

        case "GET trips/{tripId}/participants":
            // DESCRIPTION Get participants for a given trip
            // OUTPUT Array of <a href='$basehref#participants'>participants</a> + href
            AccessLevel($con,"Secured");
            return SqlResultArray($con,"SELECT * FROM $subTable WHERE tripId=$id ORDER BY id");

        case "GET trips/{tripId}/html":
            // DESCRIPTION Get trip detail and participants as HTML
            // OUTPUT HTML
            AccessLevel($con,"Secured");
            return GetTripHtml($con,$id)['html'];

        case "POST trips/{tripId}/participants":
            // DESCRIPTION Creates a participant for the given trip
            // INPUT <a href='$basehref#participants'>participants</a>
            // OUTPUT <a href='$basehref#participants'>participants</a> + href
            // INPUTENTITY participants
            $input["tripId"] = $id;
            return ApiPost($con,AccessLevel($con,"Secured"),$subTable,$input,$id);

        case "POST trips/{tripId}/edit":
            // DESCRIPTION Creates a new edit record for the given trip
            // INPUT <a href='$basehref#edit'>edit</a>
            // OUTPUT Array of all current <a href='$basehref#edit'>edits</a> for trip. The first is the one just created.
            // INPUTENTITY edit
            $input["tripId"] = $id;
            $input["userId"] = AccessLevel($con,"Unsecured");
            ApiPost($con,$input["userId"],$subTable,$input,$id);
            DeleteTripEdits($con);
            return SqlResultArray($con,"SELECT * from $subTable WHERE tripId = $id ORDER BY id DESC");

        case "GET trips/{tripId}/history":
            // DESCRIPTION Gets change history for a given trip
            // OUTPUT Array of <a href='$basehref#history'>history</a>
            return SqlResultArray($con,"SELECT * FROM $subTable WHERE tripId=$id ORDER BY id");
            
        case "POST trips/{tripId}/email":
            // DESCRIPTION Sends email to trip participants
            // INPUT <a href='$basehref#subjectbody'>subject + body</a>
            // OUTPUT Confirmation string
            // INPUTENTITY subjectbody
            SendEmail($con,$id,AccessLevel($con,"Secured"),$input['subject'],$input['body']);
            $input['result'] = "Email sent for trip $id";
            return $input;
    
        case "GET trips/{tripId}/participants/{participantId}":
            // DESCRIPTION Gets participants detail for a given trip
            // OUTPUT The <a href='$basehref#participants'>participant</a>
            return SqlResultArray($con,"SELECT * FROM $subTable WHERE id=$subId ORDER BY id")[0];
        
        case "POST trips/{tripId}/participants/{participantId}":
        case "PATCH trips/{tripId}/participants/{participantId}":
            // DESCRIPTION Updates participants detail for a given trip
            // INPUT A <a href='$basehref#participants'>participant</a>
            // OUTPUT The updated <a href='$basehref#participants'>participant</a>
            // INPUTENTITY participants
            return ApiPatch($con,AccessLevel($con,"Secured"),$subTable,$subId,$input,$id);
        
        case "POST trips/{tripId}/edit/{editId}":
        case "PATCH trips/{tripId}/edit/{editId}":
            // DESCRIPTION Maintains an edit record for the current user.
            // INPUT <a href='$basehref#edit'>edit</a> it's expected that the 'stamp' and 'isEdited' columns be updated by calls to this endpoint
            // OUTPUT Array of <a href='$basehref#edit'>edit</a>
            // OUTPUT Returns all the current edits associated with the same trip
            // INPUTENTITY edit
            ApiPatch($con,AccessLevel($con,"Unsecured"),$subTable,$subId,$input,$id);
            DeleteTripEdits($con);
            return SqlResultArray($con,"SELECT * from $subTable WHERE tripId = $id ORDER BY id DESC");

        case "POST trips/{tripId}/members/{memberId}":
        case "PATCH trips/{tripId}/members/{memberId}":
            // DESCRIPTION Sets emergency contact details for member
            // OUTPUT Single <a href='$basehref#members'>member</a>
            // INPUTENTITY members
            $userId = AccessLevel($con,"Secured");
            ApiPatch($con,$userId,$subTable,$subId,$input,$id);
            return GetMembers($con, $userId, $subId);

        case "DELETE trips/{tripId}/edit/{editId}":
            // DESCRIPTION Deletes the given edit record
            // OUTPUT Confirmation string
            AccessLevel($con,"Secured");
            SqlExecOrDie($con,"DELETE FROM $subTable WHERE id = $subId");
            return Array("Edit $subId deleted");

        case "POST trip/emails":
            // DESCRIPTION Sends any necessary emails
            // OUTPUT Array of trip indentification details for any trips that had emails send
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
            AccessLevel($con,"Privileged");
            return ImportLegacyTrips($con, $input['json'] == 'TRUNCATE');
        
        case "GET newsletters":
            // DESCRIPTION Gets newsletters. Optional ?since=YYYY-MM-DD
            // OUTPUT Array of <a href='$baseHref#newsletters'>newsletters</a>
            return GetNewsletters($con, AccessLevel($con,"Privileged"), 0, $query);

        case "GET newsletters/{newsletterId}":
            // DESCRIPTION Gets newsletter
            // OUTPUT Single <a href='$baseHref#newsletters'>newsletters</a>
            return GetNewsletters($con, AccessLevel($con,"Privileged"), $id);

        case "GET newsletters/current":
            // DESCRIPTION Gets current newsletter, if it exists
            // OUTPUT Single <a href='$baseHref#newsletters'>newsletters</a>
            return GetCurrentNewsletter($con, AccessLevel($con,"Privileged"));

        case "GET newsletters/latest":
            // DESCRIPTION Gets most recent newsletter
            // OUTPUT Single <a href='$baseHref#newsletters'>newsletters</a>
            return GetLatestNewsletter($con, AccessLevel($con,"Privileged"));

        case "GET newsletters/volumes":
            // DESCRIPTION Gets available volumes
            // OUTPUT Single <a href='$baseHref#newsletters'>newsletters</a>
            return GetVolumes($con, AccessLevel($con,"Privileged"));

        case "GET newsletters/volumes/{volumeId}":
            // DESCRIPTION Gets all the newsletters of a specific volume
            // OUTPUT Single <a href='$baseHref#newsletters'>newsletters</a>
            return GetVolume($con, AccessLevel($con,"Privileged"), $subId);

        case "GET newsletters/next":
            // DESCRIPTION Gets available volumes
            // OUTPUT Single <a href='$baseHref#newsletters'>newsletters</a>
            return GetVolumes($con, AccessLevel($con,"Privileged"));
        
        case "POST newsletters":
            // DESCRIPTION Creates a new newsletter
            // INPUT A <a href='$baseHref#newsletters'>newsletter</a>
            // OUTPUT The new <a href='$baseHref#tripsnewsletters'>newsletter</a>
            // INPUTENTITY newsletters
            return ApiPost($con, AccessLevel($con,"Privileged"),$table,$input);

        case "POST newsletters/{newsletterId}":
        case "PATCH newsletters/{newsletterId}":
            // DESCRIPTION Updates detail for a given newsletter
            // INPUT <a href='$baseHref#newsletters'>newsletters</a>
            // OUTPUT <a href='$baseHref#newsletters'>newsletters</a>
            // INPUTENTITY newsletters
            return ApiPatch($con,AccessLevel($con,"Privileged"),$table,$id,$input);

        case "POST prettyprintjson":
            // DESCRIPTION Formats JSON
            // INPUT Raw JSON as a string
            // OUTPUT Formatted JSON
            // INPUTENTITY json
            return json_decode($input['json']);

        case "GET logondetails":
            // DESCRIPTION Get logon details
            // OUTPUT id, name and role of loghed on user
            return GetLogonDetails($con,'r.role in ('.ConfigServer::editorRoles.')',False);

        default:
            die(Log($con,"ERROR","$route not supported"));
            break;
    }
}

function TableFromEntity($entity) {
    return (new ReflectionClass("ConfigServer"))->getConstants()[$entity.'Table'];
}

function AccessLevel($con, $accesslevel) {
    if ($_SERVER["HTTP_API_KEY"] != ConfigServer::apiKey) {
        $member = GetLogonDetails($con,'1=1',$accesslevel != "Unsecured");
    } else if (date("Ymd") < ConfigServer::apiKeyExpiry) {
        if (ConfigServer::apiKeyUserId == 0 && $accesslevel != "Unsecured") {
            die("not logged on");
        }
        if ($accesslevel != "Privileged") {
            return ConfigServer::apiKeyUserId;    
        }
        $member = GetMembers($con, ConfigServer::apiKeyUserId, ConfigServer::apiKeyUserId);
    } else {
        die("api key expiry");
    }

    if ($accesslevel == "Privileged" && $member['role'] == '')
    {
        die("You are not logged on as a priviledged user.");
    }
        
    return $member['id'];
}

function LogMessage($con,$level,$message,$log=true){
    if (preg_match(ConfigServer::logLevelFilter, $level) && $log) {

        if ($level == 'ERROR')
            error_log($message);

        $logTable = ConfigServer::logTable;
        $levelSql = SqlVal($con,$level);
        $messageSql = SqlVal($con,$message);
        SqlExecOrDie($con, "INSERT $logTable(level,message) VALUES($levelSql,$messageSql)", false, false);
    }

    return $message;
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
            return;
    }
    
    $historyTable = ConfigServer::historyTable;

    if ($action == 'update') {
        foreach ($after as $col => $val) {
            $colSql = SqlVal($con,$col);
            $beforeSql = SqlVal($con,$before === null ? null : $before[$col]);
            $afterSql = SqlVal($con,$after[$col]);

            if ($beforeSql != $afterSql) {
                SqlExecOrDie($con,
                    "INSERT $historyTable 
                    SET `action` = '$action'
                    ,   `table` = '$table'
                    ,   `timestamp` = UTC_TIMESTAMP()
                    ,   `userId` = $userId
                    ,   `tripId` = $tripId
                    ,   `participantId` = $participantId
                    ,   `column` = $colSql
                    ,   `before` = $beforeSql
                    ,   `after` = $afterSql");
            }
        }
    } else {
        SqlExecOrDie($con,
            "INSERT $historyTable 
            SET `action` = '$action'
            ,   `table` = '$table'
            ,   `timestamp` = UTC_TIMESTAMP()
            ,   `userId` = $userId
            ,   `tripId` = $tripId
            ,   `participantId` = $participantId");
    }
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
    History($con,$userId,"create",$table,null,$after[0],$tripId || $id);
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
            strpos($sqlcol["Type"],"date") !== false) {
            $set []= "`$col`=".SqlVal($con,$val);
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
             $table === ConfigServer::editTable)
        return $col === 'id';
    else
        return true;
}

function ApiHelp($con,$basehref) {
    $html = "";
    $content = array();
    $entities = array();
    $constants = (new ReflectionClass("ConfigServer"))->getConstants();
    $filehandle = fopen("api.php", "r") or die("Unable to open file!");
    $item = Array('security'=>'Unsecured');

    // Pares this file to extract enpoint information
    while (!feof($filehandle)) {
        $line = str_replace('$basehref',$basehref,trim(fgets($filehandle)));
        if (preg_match('/case "(GET|POST|PATCH|DELETE)( (.*))?":/',$line,$matches))
            $item['entries'] []= array("method"=>$matches[1], "path"=>$matches[3]);
        else if (preg_match('/\/\/ (DESCRIPTION|INPUT|OUTPUT|INPUTENTITY) (.*)/',$line,$matches))
            $item[strtolower($matches[1])] .= "$matches[2]<br/>";
        else if (preg_match('/AccessLevel\(\$con,"(.*?)"\)/',$line,$matches))
            $item["security"] = "$matches[1]";

        if (preg_match('/return .*;/',$line,$matches) && array_key_exists('entries',$item)) {
            $content [] = $item;
            $item = Array('security'=>'Unsecured');
        }
    }
    fclose($filehandle);

    // Add data structure meta data for config and members, from API results
    foreach (array("config","members") as $entity) {
        $table = $constants[$entity."Table"];
        $data = ApiProcess($con,$basehref,"GET","GET $entity",$entity,null,null,null,null)[0];
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
                td,th {border: solid 1px gray}
                .GET    {background: lightgreen; }
                .POST   {background: cyan;       }
                .PATCH  {background: plum;       }
                .DELETE {background: red;        }
            </style>";

    // Add endpoint information as HTML
    $apipath = str_replace('api.php','ApiTest.html',$basehref);
    $html .= "<table>";
    $html .= "<tr><th colspan='2'>Endpoint</th><th>Security</th><th>Description</th><th>Input</th><th>Output</th></tr>";
    foreach ($content as &$val) {
        $val['basehref'] = $basehref;
        $val['fields'] = array_key_exists('inputentity',$val) ? json_encode($entities[str_replace('<br/>','',$val['inputentity'])]) : "[]";
        foreach ($val['entries'] as $index => $entry) {
            $val['method'] = $entry['method'];
            $val['path'] = $entry['path'];
            $html .= "<tr>
                        <th class='$val[method]'>$val[method]</th>
                        <td><a href='$apipath?".http_build_query($val)."'>$val[path]</a></td>";
            if ($index == 0)
                $html .= "<td rowspan='".sizeof($val['entries'])."'>$val[security]</td>
                          <td rowspan='".sizeof($val['entries'])."'>$val[description]</td>
                          <td rowspan='".sizeof($val['entries'])."'>$val[input]</td>
                          <td rowspan='".sizeof($val['entries'])."'>$val[output]</td>";
            $html .= "</tr>";
        }
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