<?php

    define('_JEXEC', 1);
    require_once( 'alastair.php' );
    require('config.php');
    require('trips.php');
    require('members.php');

    // Extract data from parameters 
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method == "OPTIONS") {
        header("Access-Control-Allow-Origin: *");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE');
        header('Access-Control-Allow-Headers: Api-Key, Api-User-Id');
        header('Access-Control-Max-Age: 86400');    // cache for 1 day
    } else {
        $request = explode('/', trim($_SERVER['PATH_INFO'],'/'));
        $entity = sizeof($request) ? preg_replace('/[^a-z0-9_]/i','',array_shift($request)) : false;
        $id = sizeof($request) && intval($request[0]) ? intval(array_shift($request)) : 0;
        $sub_entity = sizeof($request) ? preg_replace('/[^a-z0-9_]/i','',array_shift($request)) : false;
        $sub_id = sizeof($request) && intval($request[0]) ? intval(array_shift($request)) : 0;
        $input = json_decode(file_get_contents('php://input'),true);
        $edit_id = intval($_GET["edit_id"]);
        $base_href = "https://$_SERVER[HTTP_HOST]$_SERVER[SCRIPT_NAME]";
        $route = $method.($entity ? " $entity" : "").($id ? '/{'.rtrim($entity,'s').'_id}' : '')
                        .($sub_entity ? "/$sub_entity" : "").($sub_id ? '/{'.rtrim($sub_entity,'s').'_id}' : '');
        $result = ApiProcess($con,$base_href,$route,$entity,$id,$sub_entity,$sub_id,$input,$edit_id);

        if (gettype($result) == 'string') {
            header('Content-Type: text/html');
            echo $result;
        } else {
            $result = AddHRefs($result,$base_href,$entity,$sub_entity);

            if (intval($_GET["prettyprintjson"])) {
                header('Content-Type: text/html');
                echo "<pre>".PrettyPrintJson($result,true)."</pre>";
            } else {
                header('Content-Type: application/json');
                echo json_encode($result);
            }
        }
    }

    mysqli_close($con);
    
function ApiProcess($con,$base_href,$route,$entity,$id,$sub_entity,$sub_id,$input,$edit_id){
    
	$table = TableFromEntity($entity);		
    $sub_table = TableFromEntity($sub_entity);		
    error_log("$route $base_href $entity $id $sub_entity $edit_id ".json_encode($input));
    switch ($route) {
        case "GET":
            // DESCRIPTION Gets this API documentation
            return ApiHelp($con,ApiUserId($con),$base_href);

        case "GET config":
            // DESCRIPTION Gets global configuration parameters
            // OUTPUT A single <a href='$base_href#config'>config</a> record
            return array((new ReflectionClass("ConfigClient"))->getConstants());
        
        case "GET members":
            // DESCRIPTION Gets members
            // OUTPUT Array of <a href='$base_href#members'>members</a>
            return GetMembers($con, ApiUserId($con));

        case "GET members/{member_id}":
            // DESCRIPTION Gets member
            // OUTPUT Single <a href='$base_href#members'>members</a>
            return GetMembers($con, ApiUserId($con), $id)[0];

        case "GET trips":
            // DESCRIPTION Gets all trips whose close date is after the current date less one week
            // OUTPUT Array of <a href='$base_href#trips'>trips</a> + tripState + leaders
            return GetTrips($con, ApiUserId($con,FALSE));
        
        case "POST trips":
            // DESCRIPTION Creates a new trip
            // INPUT A <a href='$base_href#trips'>trip</a>
            // OUTPUT The new <a href='$base_href#trips'>trip</a>
            // INPUTENTITY trips
            return ApiPost($con,ApiUserId($con),$table,$input,$edit_id);
            
        case "GET trips/{trip_id}":
            // DESCRIPTION Gets detail for a given trip
            // OUTPUT <a href='$base_href#trips'>trips</a> + tripState + leaders + role + href
            return GetTrips($con, ApiUserId($con,FALSE), $id);
        
        case "POST trips/{trip_id}":
        case "PATCH trips/{trip_id}":
            // DESCRIPTION Updates trip detail for a given trip
            // INPUT <a href='$base_href#trips'>trips</a>
            // OUTPUT <a href='$base_href#trips'>trips</a>
            // INPUTENTITY trips
            return ApiPatch($con,ApiUserId($con),$table,$id,$input,$edit_id);

        case "GET trips/{trip_id}/participants":
            // DESCRIPTION Get participants for a given trip
            // OUTPUT Array of <a href='$base_href#participants'>participants</a> + href
            return SqlResultArray($con,"SELECT * FROM $sub_table WHERE trip_id=$id ORDER BY id");

        case "GET trips/{trip_id}/html":
            // DESCRIPTION Get trip detail and participants as HTML
            // OUTPUT HTML
            return GetTripHtml($con,$id)['html'];

        case "POST trips/{trip_id}/participants":
            // DESCRIPTION Creates a participant for the given trip
            // INPUT <a href='$base_href#participants'>participants</a>
            // OUTPUT <a href='$base_href#participants'>participants</a> + href
            // INPUTENTITY participants
            $input["trip_id"] = $id;
            return ApiPost($con,ApiUserId($con),$sub_table,$input,$edit_id);

        case "POST trips/{trip_id}/edit":
            // DESCRIPTION Creates a new edit record for the given trip
            // INPUT <a href='$base_href#edit'>edit</a>
            // OUTPUT Array of all current <a href='$base_href#edit'>edits</a> for trip. The first is the one just created.
            // INPUTENTITY edit
            $input["trip_id"] = $id;
            $input["user_id"] = ApiUserId($con);
            ApiPost($con,ApiUserId($con),$sub_table,$input,$edit_id);
            DeleteTripEdits($con);
            return SqlResultArray($con,"SELECT * from $sub_table WHERE trip_id = $id ORDER BY id DESC");

        case "GET trips/{trip_id}/change_history":
            // DESCRIPTION Gets change history for a given trip
            // OUTPUT Array of <a href='$base_href#change_history'>change_history</a> + href
            return SqlResultArray($con,"SELECT * FROM $sub_table WHERE trip_id=$id ORDER BY id");
            
        case "POST trips/{trip_id}/email":
            // DESCRIPTION Sends email to trip participants
            // INPUT <a href='$base_href#subjectbody'>subject + body</a>
            // OUTPUT Confirmation string
            // INPUTENTITY subjectbody
            SendEmail($con,$id,null,ApiUserId($con),$input['subject'],$input['body']);
            return Array("Email sent for trip $id");
    
        case "GET trips/{trip_id}/participants/{participant_id}":
            // DESCRIPTION Gets participants detail for a given trip
            // OUTPUT The <a href='$base_href#participants'>participant</a>
            return SqlResultArray($con,"SELECT * FROM $sub_table WHERE id=$sub_id ORDER BY id")[0];
        
        case "POST trips/{trip_id}/participants/{participant_id}":
        case "PATCH trips/{trip_id}/participants/{participant_id}":
            // DESCRIPTION Updates participants detail for a given trip
            // INPUT A <a href='$base_href#participants'>participant</a>
            // OUTPUT The updated <a href='$base_href#participants'>participant</a>
            // INPUTENTITY participants
            return ApiPatch($con,ApiUserId($con),$sub_table,$sub_id,$input,$edit_id);
        
        case "POST trips/{trip_id}/edit/{edit_id}":
        case "PATCH trips/{trip_id}/edit/{edit_id}":
            // DESCRIPTION Maintains an edit record for the current user.
            // INPUT <a href='$base_href#edit'>edit</a> it's expected that the 'stamp' and 'is_edited' columns be updated by calls to this endpoint
            // OUTPUT Array of <a href='$base_href#edit'>edit</a>
            // OUTPUT Returns all the current edits associated with the same trip
            // INPUTENTITY edit
            ApiPatch($con,ApiUserId($con),$sub_table,$sub_id,$input);
            DeleteTripEdits($con);
            return SqlResultArray($con,"SELECT * from $sub_table WHERE trip_id = $id ORDER BY id DESC");

        case "DELETE trips/{trip_id}/edit/{edit_id}":
            // DESCRIPTION Deletes the given edit record
            // OUTPUT Confirmation string
            SqlExecOrDie($con,"DELETE FROM $sub_table WHERE id = $sub_id");
            return Array("Edit $sub_id deleted");

        case "GET trip/emails":
        case "POST trip/emails":
            // DESCRIPTION Sends any necessary emails
            // OUTPUT Array of trip indentification details for any trips that had emails send
            return PostEmails($con);

        case "POST prettyprintjson":
            // DESCRIPTION Formats JSON
            // OUTPUT Formatted JSON
            // INPUTENTITY json
            return json_decode($input['json']);

        default:
            die(Dump("$route not supported"));
            break;
    }
}

function ApiUserId($con, $dieonfail=TRUE) {
    if ($_SERVER["HTTP_API_KEY"] == ConfigServer::api_key) {
        date("Ymd") < ConfigServer::api_key_expiry || die("api key expiry");
        return $_SERVER["HTTP_API_USER_ID"];
    } else {
        $logondetails = GetLogonDetails($con,$username,'1=1',$dieonfail);
        return $logondetails['userid'];
    }
}

function TableFromEntity($entity) {
    return (new ReflectionClass("ConfigServer"))->getConstants()[$entity.'_table'];
}

function Dump($msg){
    error_log($msg);
    return $msg;
}

function ChangeHistory($con,$user_id,$verb,$table,$before,$after,$edit_id)
{
    switch ($table)
    {
        case ConfigServer::trips_table:
            $noun = "Trip";
            $trip_id = $after["id"];
            $participant_id = "null";
            break;
        case ConfigServer::participants_table:
            $noun = "Participant";
            $trip_id = $after["trip_id"];
            $participant_id = $after["id"];
            break;
        default:
            return;
    }
    
    $change_history_table = ConfigServer::change_history_table;
    $edit_table = ConfigServer::edit_table;
    $beforeJson = $before === null ? "null" : "'".mysqli_real_escape_string($con,json_encode($before))."'";
    $afterJson = "'".mysqli_real_escape_string($con,json_encode($after))."'";

    if ($edit_id === null) {
        SqlExecOrDie($con,"INSERT $edit_table SET trip_id = $trip_id, stamp = UTC_TIMESTAMP(), user_id = $user_id");
        $edit_id = mysqli_insert_id($con);
    }

    SqlExecOrDie($con,
       "INSERT $change_history_table 
        SET `action` = '$verb $noun'
        ,   `edit_id` = $edit_id
        ,   `timestamp` = UTC_TIMESTAMP()
        ,   `user_id` = $user_id
        ,   `trip_id` = $trip_id
        ,   `participant_id` = $participant_id
        ,   `before` = $beforeJson
        ,   `after` = $afterJson");
}

function ApiPatch($con,$user_id,$table,$id,$input,$edit_id=null){
    $set = SqlSetFromInput($con, $input, $table);
    $sql = "UPDATE $table SET $set WHERE id=$id";
    $before = SqlResultArray($con,"SELECT * FROM $table WHERE id = $id");
    SqlExecOrDie($con,$sql);
    $after = SqlResultArray($con,"SELECT * FROM $table WHERE id = $id");
    ChangeHistory($con,$user_id,"Update",$table,$before[0],$after[0],$edit_id);
    return $after;
}

function ApiPost($con,$user_id,$table,$input,$edit_id){
    $set = SqlSetFromInput($con, $input, $table);
    $sql = "INSERT $table SET $set";
    SqlExecOrDie($con,$sql);
    $id = mysqli_insert_id($con);
    $after = SqlResultArray($con,"SELECT * FROM $table WHERE id = $id");
    ChangeHistory($con,$user_id,"Create",$table,null,$after[0],$edit_id);
    return $after;
}

function SqlSetFromInput($con,$input,$table){
    $set = array();
    $cols = SqlResultArray($con,"SHOW COLUMNS FROM $table","Field",true);
    unset($cols["ID"]);
    foreach ($input as $col => $val) {

        if (!array_key_exists(strtoupper($col), $cols)) {
            continue;
        }

        $sqlcol = $cols[strtoupper($col)];

        if (strpos($sqlcol["Type"],"text") !== false || 
            strpos($sqlcol["Type"],"char") !== false || 
            strpos($sqlcol["Type"],"date") !== false) {
            $sqlval = mysqli_real_escape_string($con,$val);
            $set []= "`$col`='$sqlval'";
        } else {
            $sqlval = floatval($val);
            $set []= "`$col`=$sqlval";
        }
    }

    return implode(",", $set);
}

function AddHRef(&$row,$base_href,$entity,$sub_entity) {
    if (!is_array($row)) return;
    if (array_key_exists("id", $row) && intval($row["id"])) $row["href"]                = "$base_href/$entity/$row[id]";
    if (array_key_exists("member_id", $row))                $row["member_href"]         = "$base_href/members/$row[member_id]";
    if (array_key_exists("user_id", $row ))                 $row["user_href"]           = "$base_href/members/$row[user_id]";
    if (array_key_exists("participant_id", $row ))          $row["participant_href"]    = "$base_href/trips/$row[trip_id]/participants/$row[user_id]";
    if ("$entity/$sub_entity" == "trips/")                  $row["participants_href"]   = "$base_href/trips/$row[id]/participants";
    if ("$entity/$sub_entity" == "trips/")                  $row["change_history_href"] = "$base_href/trips/$row[id]/change_history";
    if ("$entity/$sub_entity" == "trips/")                  $row["edits_href"]          = "$base_href/trips/$row[id]/edits";
    if ("$entity/$sub_entity" == "trips/edit")              $row["href"]                = "$base_href/trips/$row[trip_id]/edit/$row[id]";
    if ("$entity/$sub_entity" == "trips/participants")      $row["href"]                = "$base_href/trips/$row[trip_id]/participants/$row[id]";
}

function AddHRefs(&$result,$base_href,$entity,$sub_entity) {

    if (is_array($result) && sizeof($result)) {
        if (array_keys($result) === range(0, count($result) - 1)) {
            foreach ($result as &$row) {
                AddHRef($row,$base_href,$entity,$sub_entity);
            }
        } else {
            AddHRef($result,$base_href,$entity,$sub_entity);
        }
    }

    return $result;
}

function ApiHelp($con,$user_id,$base_href) {
    $content = array();
    $entities = array();
    $constants = (new ReflectionClass("ConfigServer"))->getConstants();
    $filehandle = fopen("api.php", "r") or die("Unable to open file!");

    while (!feof($filehandle)) {
        $line = str_replace('$base_href',$base_href,trim(fgets($filehandle)));
        if (preg_match('/case "(GET|POST|PATCH|DELETE)( (.*))?":/',$line,$matches)) {
            $content[] = array("METHOD"=>$matches[1], "PATH"=>$matches[3], "BASEHREF"=>$base_href);
        } else if (preg_match('/\/\/ (DESCRIPTION|INPUT|OUTPUT|INPUTENTITY) (.*)/',$line,$matches)) {
            $content[sizeof($content)-1][$matches[1]] .= "$matches[2]<br/>";
        }
    }
    fclose($filehandle);

    foreach (array("config","members") as $entity) {
        $data = ApiProcess($con,$base_href,"GET $entity",$entity,null,null,null,null,null);
        $data = $entity == "config" ? $data : $data[0];
        $cols = array();
        
        foreach ($data as $col => $val) {
            $cols []= array("col"=>$col,"type"=>gettype($val),"comment"=>$entity == "config" ? "Current value is $val" : "");
        }
        $entities[$entity] = $cols;
    }

    foreach (array("trips","participants","change_history","edit") as $entity) {
        $sql_cols = SqlResultArray($con,"SHOW FULL COLUMNS FROM ".$constants[$entity."_table"],"Field");
        $cols = array();

        AddHRef($sql_cols,$base_href,"trips",$entity == "trips" ? "" : $entity);
        foreach ($sql_cols as $field => $col) {
            if (preg_match('/^href$/', $field))
                $cols []= array("col"=>$field,"type"=>"hyperlink","comment"=>"Link to $entity");
            else if (preg_match('/_href$/', $field))
                $cols []= array("col"=>$field,"type"=>"hyperlink","comment"=>"Link to ".str_replace("_href","",$field));
            else
                $cols []= array("col"=>$field,"type"=>$col["Type"],"comment"=>$col["Comment"] ? $col["Comment"] : "");
        }
        $entities[$entity] = $cols;
    }

    $entities["subjectbody"] = array(array("col"=>"subject","type"=>"string","comment"=>"The email subject"),
                                     array("col"=>"body",   "type"=>"text",  "comment"=>"The email body"));
    $entities["json"] =        array(array("col"=>"json",   "type"=>"text",  "comment"=>"The json to format"));

    $html = "<style>
                body {font-family: arial;}
                table {border-collapse: collapse} 
                td,th {border: solid 1px gray}
                .GET    {background: lightgreen; }
                .POST   {background: cyan;       }
                .PATCH  {background: plum;       }
                .DELETE {background: red;        }
            </style>";

    $html .= "<table>";
    $html .= "<tr><th colspan='2'>Endpoint</th><th>Description</th><th>Input</th><th>Output</th></tr>";
    foreach ($content as &$val) {
        $val['FIELDS'] = array_key_exists('INPUTENTITY',$val) ? json_encode($entities[str_replace('<br/>','',$val['INPUTENTITY'])]) : "[]";
        $html .= "<tr>
                    <th class='$val[METHOD]'>$val[METHOD]</th>
                    <td><a href='".str_replace('api.php','ApiTest.html',$base_href)."?".http_build_query($val)."'>$val[PATH]</a></td>
                    <td>$val[DESCRIPTION]</td>
                    <td>$val[INPUT]</td>
                    <td>$val[OUTPUT]</td>
                </tr>";
    }
    $html .= "</table>";

    foreach ($entities as $entity => $cols) {
        $html .= "<h2 id='$entity'>$entity</h2>";
        $html .= "<table><tr><th>Column</th><th>Type</th><th>Comments</th></tr>";
        foreach ($cols as $col)
            $html .= "<tr><td>$col[col]</td><td>$col[type]</td><td>$col[comment]</td></tr>";
        $html .= "</table>";
    }

    return $html;
}

?> 