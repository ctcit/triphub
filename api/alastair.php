<?php

define('_JEXEC', 1);
define('JPATH_BASE', dirname(dirname(__DIR__)));// Assume we are two levels down in website
require_once ( JPATH_BASE.'/includes/defines.php' );
require_once ( JPATH_BASE.'/includes/framework.php' );
$app = JFactory::getApplication('site');
$user = JFactory::getUser();
$config = JFactory::getConfig();


$con = ($GLOBALS["___mysqli_ston"] = mysqli_connect($config->get("host"), $config->get("user"), $config->get("password")));
// N.B. userid here is the JOOMLA id NOT the db id. The common ground here is username.
$username = array("id"=>$user->id,"name"=>$user->username);

if (!$con)
    die('mysql_connect failed');
$con->set_charset('utf8mb4');

function GetLogonDetails($con,$roleclause="1=1",$dieonfail=TRUE)
{
    $user = JFactory::getUser();
    $userrow = SqlResultArray($con,"
            SELECT primaryEmail,firstName,lastName,m.id
            FROM ctc.members             m
            LEFT JOIN ctc.members_roles  mr  on mr.memberid = m.id
            LEFT JOIN ctc.roles          r   on r.id = mr.roleid
            where loginname = ".SqlVal($con,$user->username)." and $roleclause");

    if ($dieonfail && count($userrow) == 0)
        die("You are not logged on.");

	if (count($userrow))
        return array(
            "userid"    => $userrow[0]["id"],
            "username"  => $user->username,
            "email"     => $userrow[0]["primaryEmail"],
            "firstname" => $userrow[0]["firstName"],
            "lastname"  => $userrow[0]["lastName"]);
    else
        return array(
            "userid"    => 0,
            "username"  => '',
            "email"     => '',
            "firstname" => '',
            "lastname"  => '');
}

function SqlVal($con,$value) {
    return $value === null ? "null" : "'".mysqli_real_escape_string($con,$value)."'";
}

function SqlResultArray($con,$sql,$keycol='',$keyupper=false)
{
    $cursor = mysqli_query($con, $sql);

    if (!$cursor)
        die(LogMessage($con,"ERROR","Invalid query: ".
                ((is_object($con)) ? mysqli_error($con) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false))."\n".
                $sql));

    LogMessage($con,'SQL',$sql);        
    $fields = mysqli_fetch_fields($cursor);
    $rows = array();
    while (($row = mysqli_fetch_array($cursor, MYSQLI_ASSOC))) {
        foreach ($fields as $field) {
            if ($row[$field->name] != null) {
                if (preg_match('/^is_/',$field->name)) {
                    $row[$field->name] = $row[$field->name] == '1';
                }
                else {
                    switch ($field->type) {
                        case MYSQLI_TYPE_BIT:
                            $row[$field->name] = $row[$field->name] == '1';
                            break;
                        case MYSQLI_TYPE_FLOAT:
                        case MYSQLI_TYPE_DOUBLE:
                            $row[$field->name] = doubleval($row[$field->name]);
                            break;
                        case MYSQLI_TYPE_TINY:
                        case MYSQLI_TYPE_SHORT:
                        case MYSQLI_TYPE_LONG:
                        case MYSQLI_TYPE_LONGLONG:
                        case MYSQLI_TYPE_INT24:
                            $row[$field->name] = intval($row[$field->name]);
                            break;
                    }
                }
            }
        }

        if ($keycol == '')
            $rows []= $row;
        else if ($keyupper)
            $rows[strtoupper($row[$keycol])] = $row;
        else
            $rows[$row[$keycol]] = $row;
    }
    mysqli_free_result($cursor);

    return $rows;
}

function SqlResultScalar($con, $sql) {
    $array = SqlResultArray($con, $sql);
    if (!is_array($array) || count($array) != 1) {
        return null;
    }
    $values = array_values($array[0]); // Get rid of the keys
    return is_scalar($values[0]) ? $values[0] : null;
}

function SqlExecOrDie($con,$sql,$log=true) {
    if (!mysqli_query($con, $sql))
        die(LogMessage($con,"ERROR","Invalid query: ".
                ((is_object($con)) ? mysqli_error($con) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false))."\n".
                $sql,$log));

    $rows = mysqli_affected_rows($con); 
    
    LogMessage($con,'SQL',"$sql -- $row row(s) affected",$log);        
        
    return $row;
}

function PrettyPrintJson($json) {
    $text = json_encode($json, JSON_PRETTY_PRINT);
    $html = "";
    $pos = 0;
    $stack = array();
    preg_match_all('/"(\\\\.|[^"])*"[:]?|[\[\]\{\}]|null|true|false/', $text, $matches, PREG_OFFSET_CAPTURE);
    foreach ($matches[0] as $item) {
        $match = $item[0];
        $offset = $item[1];
        $html .= htmlentities(substr( $text, $pos, $offset - $pos));
        $pos = $offset + strlen($match);

        if (substr($match,-1) == ':') 
            $html .= "<span style='color:teal'>".htmlentities( $match )."</span>";
        else if (substr($match,0,10) == '"http:\/\/' || substr($match,0,11) == '"https:\/\/') 
            $html .= "<a href='".json_decode($match)."?prettyprintjson=1'>".htmlentities( $match )."</a>";
        else if (substr($match,0,1) == '"')
            $html .= "<span style='color:red'>".htmlentities( $match )."</span>";
        else if ($match == '[' || $match == '{') {
            array_push( $stack, $pos );
            $html .= "<span style='color:blue' class='block' id='$pos'>$match</span>".
                     "<span style='display: none; color:red' class='block' id='$pos-hide'>...</span><span id='$pos-show'>";
        } else if ($match == ']' || $match == '}')
            $html .= "</span><span style='color:blue' class='block' id='".array_pop($stack)."-close'>$match</span>";
        else
            $html .= "<span style='color:blue'>".htmlentities( $match )."</span>";
    }

    return $html.htmlentities(substr( $text, $pos, strlen($text)-$pos));
}
?>
