<?php

if (!defined('_JEXEC')) {
    define('_JEXEC', 1);
}
define('JPATH_BASE', dirname(dirname(__DIR__)));// Assume we are two levels down in website
require_once ( JPATH_BASE.'/includes/defines.php' );
require_once ( JPATH_BASE.'/includes/framework.php' );

if ( !array_key_exists('HTTP_HOST', $_SERVER) || $_SERVER['HTTP_HOST'] == "" ) {
    $_SERVER['HTTP_HOST'] = "http://ctc.org.nz";
}

// Boot the DI container
$container = \Joomla\CMS\Factory::getContainer();

/*
* Alias the session service keys to the web session service as that is the primary session backend for this application
*
* In addition to aliasing "common" service keys, we also create aliases for the PHP classes to ensure autowiring objects
* is supported.  This includes aliases for aliased class names, and the keys for aliased class names should be considered
* deprecated to be removed when the class name alias is removed as well.
*/
$container->alias('session.web', 'session.web.site')
    ->alias('session', 'session.web.site')
    ->alias('JSession', 'session.web.site')
    ->alias(\Joomla\CMS\Session\Session::class, 'session.web.site')
    ->alias(\Joomla\Session\Session::class, 'session.web.site')
    ->alias(\Joomla\Session\SessionInterface::class, 'session.web.site');

// Instantiate the application.
$app = $container->get(\Joomla\CMS\Application\SiteApplication::class);
$user = JFactory::getUser();
$config = JFactory::getConfig();


$con = ($GLOBALS["___mysqli_ston"] = mysqli_connect($config->get("host"), $config->get("user"), $config->get("password")));
// N.B. userid here is the JOOMLA id NOT the db id. The common ground here is username.
$username = ["id"=>$user->id, "name"=>$user->username];

if (!$con) {
    die('mysql_connect failed');
}
$con->set_charset('utf8mb4');

function LogMessage(mysqli $con, string $level, string $message, bool $log=true): string {
    if (preg_match(ConfigServer::logLevelFilter, $level) && $log) {

        if ($level == 'ERROR')
            error_log($message);

        $logTable = ConfigServer::logTable;
        $levelSql = SqlVal($con, $level);
        $messageSql = SqlVal($con, $message);
        SqlExecOrDie($con, "INSERT $logTable(level, message) VALUES($levelSql, $messageSql)", false, false);
    }

    return $message;
}

function GetLogonDetails(mysqli $con, bool $dieonfail=true): array {
	$memberRolesTable = ConfigServer::memberRolesTable;
    $user = JFactory::getUser();
    $userrow = SqlResultArray($con,
            "SELECT m.id
            ,       loginname as name
            ,       mr.role as role
            FROM ctc.members             m
            LEFT JOIN $memberRolesTable  mr  on mr.memberId = m.id
            where loginname = ".SqlVal($con,$user->username));

    if ($dieonfail && !$userrow) {
        die("You are not logged on.");
    }

    return $userrow[0] ?? ["id" => 0,"name"  => '',"role"  => ''];
}

function SqlVal(mysqli $con, $value): string {
    if ( $value === null ) {
        return "null";
    } else {
        return $value === false ? "'0'" : "'".mysqli_real_escape_string($con,$value)."'";
    }
}

function SqlJSONVal(mysqli $con, mixed $value): string {
    if ( $value === null ) {
        return "null";
    } else if ($value === false) {
        return "'0'";
    } else if (is_numeric($value)) {
        return "'".mysqli_real_escape_string($con,$value)."'";
    } else {
        return "'\"".mysqli_real_escape_string($con,$value)."\"'";
    }
}

function SqlResultArray(mysqli $con, string $sql, string $keycol='', bool $keyupper=false): array {
    $cursor = mysqli_query($con, $sql);

    if (!$cursor) {
        http_response_code(500);
        die(LogMessage($con,"ERROR","Invalid query: ".
                ((is_object($con)) ? mysqli_error($con) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false))."\n".
                $sql));
    }

    LogMessage($con,'SQL',$sql);        

    $fields = mysqli_fetch_fields($cursor);
    $rows = [];
    while (($row = mysqli_fetch_array($cursor, MYSQLI_ASSOC))) {
        foreach ($fields as $field) {
            if ($row[$field->name] != null) {
                if (preg_match('/^is[_A-Z]/',$field->name)) {
                    $row[$field->name] = $row[$field->name] == '1';
                } else {
                    switch ($field->type) {
                        case MYSQLI_TYPE_BIT:
                            $row[$field->name] = $row[$field->name] == '1';
                            break;
                        case MYSQLI_TYPE_FLOAT:
                        case MYSQLI_TYPE_DOUBLE:
                        case MYSQLI_TYPE_DECIMAL:
                        case 246:
                            $row[$field->name] = doubleval($row[$field->name]);
                            break;
                        case MYSQLI_TYPE_TINY:
                        case MYSQLI_TYPE_SHORT:
                        case MYSQLI_TYPE_LONG:
                        case MYSQLI_TYPE_LONGLONG:
                        case MYSQLI_TYPE_INT24:
                            $row[$field->name] = intval($row[$field->name]);
                            break;
                        case MYSQLI_TYPE_JSON:
                            $row[$field->name] = json_decode($row[$field->name]);
                            break;
                    }
                }
            }
        }

        if ($keycol == '') {
            $rows []= $row;
        } else if ($keyupper) {
            $rows[strtoupper($row[$keycol])] = $row;
        } else {
            $rows[$row[$keycol]] = $row;
        }
    }
    mysqli_free_result($cursor);

    return $rows;
}

function SqlResultScalar(mysqli $con, string $sql) {
    $array = SqlResultArray($con, $sql);
    if (!is_array($array) || count($array) != 1) {
        return null;
    }
    $values = array_values($array[0]); // Get rid of the keys
    return is_scalar($values[0]) ? $values[0] : null;
}

function SqlExecOrDie(mysqli $con, string $sql, bool $returnid=false, bool $log=true): int {
    if (!mysqli_query($con, $sql)) {
        http_response_code(500);
        die('<pre>'.LogMessage($con,"ERROR","Invalid query: ".
                ((is_object($con)) ? mysqli_error($con) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false))."\n".
                $sql,$log).'</pre>');
    }

    $result = $returnid ? mysqli_insert_id($con) : mysqli_affected_rows($con); 
    
    LogMessage($con,'SQL',"$sql -- result: $result",$log);        
        
    return $result;
}

function PrettyPrintJson($json): string {
    $text = json_encode($json, JSON_PRETTY_PRINT);
    $html = "";
    $pos = 0;
    $stack = [];
    $counts = [0];
    preg_match_all('/"(\\\\.|[^"])*"[:]?|[\[\]\{\}]|null|true|false|[0-9][0-9\\.]*/', $text, $matches, PREG_OFFSET_CAPTURE);
    foreach ($matches[0] as $item) {
        $match = $item[0];
        $offset = $item[1];
        $html .= htmlentities(substr( $text, $pos, $offset - $pos));
        $pos = $offset + strlen($match);
        $counts[sizeof($counts)-1]++;
        $depth = 'depth'.count($stack);

        if (substr($match,-1) == ':') {
            $counts[sizeof($counts)-1]--;
            $html .= "<span style='color:teal'>".htmlentities( $match )."</span>";
        } else if (substr($match,0,10) == '"http:\/\/' || substr($match,0,11) == '"https:\/\/') {
            $html .= "<a href='".json_decode($match)."?prettyprintjson=1'>".htmlentities( $match )."</a>";
        } else if (substr($match,0,1) == '"') {
            $html .= "<span style='color:red'>".htmlentities( $match )."</span>";
        } else if ($match == '[' || $match == '{') {
            array_push( $stack, $offset );
            array_push( $counts, 0 );
            $html .= "<span style='color:blue' class='block $depth' id='$offset'>$match</span>".
                     "<span id='$offset-show'>";
        } else if ($match == ']' || $match == '}') {
            $start = array_pop($stack);
            $count = array_pop($counts) - 1;
            $html .= "</span>".
                     "<span style='display: none; color:orange' class='block' id='$start-hide'>&lt;$count items&gt;</span>".
                     "<span style='color:blue' class='block' id='$start-close'>$match</span>";
        } else if ($match == 'null' || $match == 'true' || $match == 'false') {
            $html .= "<span style='color:blue'>$match</span>";
        } else {
            $html .= $match;
        }
    }

    return "<pre>".$html.htmlentities(substr( $text, $pos, strlen($text)-$pos))."</pre>";
}

function ParseCss(string $text) : array {
    $text = preg_replace("/\/\*.*\*\//","",$text);
    $css = [];

    foreach (explode("}",$text) as $style) {
        $stylesplit = explode("{",$style);
        if (count($stylesplit) < 2) {
            continue;
        } 
        foreach (explode(",",$stylesplit[0]) as $selector) {
            foreach (explode(";",trim($stylesplit[1],"; \t\r\n")) as $val) {
                $valsplit = explode(":",$val);
                if (count($valsplit) < 2) {
                    continue;
                } 
                $css[trim($selector)][trim($valsplit[0])] = preg_replace("/^([0-9]+)px$/","$1",trim($valsplit[1]));
            }
        }
    }

    return $css;
}

function MakeGuid(): string {
    return sprintf('%04X%04X-%04X-%04X-%04X-%04X%04X%04X', 
                    mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(16384, 20479), 
                    mt_rand(32768, 49151), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535));
}


?>
