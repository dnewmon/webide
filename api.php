<?php

session_start();

$input = null;

if (isset($_POST['action'])) {
    $input = $_POST;
}
else {
    $input = json_decode(file_get_contents('php://input'), true);
}

$PROJECT_PATH = "/var/www/html/";

$WHITELISTED_PATHS = array(
    dirname(__FILE__),
    $PROJECT_PATH,
);

class ApiMethods {
    public function logout() {
        session_destroy();
    }
    
    public function getCurrentFolder() {
        echo dirname(__FILE__);
    }
    
    public function createFile() {
        global $input;
        
        echo "Creating file: " . $input["path"];
        file_put_contents($input["path"], "");
    }
    
    public function saveFile() {
        global $input;
        
        if (file_exists($input["path"])) {
            copy($input["path"], $input["path"] . ".bak");
        }
        
        file_put_contents($input["path"], $input["content"]);
    }
    
    public function uploadFile() {
        global $input;
        
        if (file_exists($input["path"])) {
            copy($input["path"], $input["path"] . ".bak");
        }
        
        move_uploaded_file($_FILES['content']['tmp_name'], $input["path"]);
        echo "File Uploaded To: " . $input["path"];
    }
    
    public function renameFile() {
        global $input;
        
        rename($input["path"], $input["newpath"]);
    }
    
    public function executeTerminalCommand() {
        global $input;
        
        chdir($input["path"]);
        system($input["command"]);
    }
    
    public function executeBackgroundTerminalCommand() {
        global $input;
        
        chdir($input["path"]);
        system($input["command"]);
    }
    
    public function combinePath() {
        global $input;
        
        echo realpath($input["path1"] . $input["path2"]);
    }
    
    public function ping() {
        echo 'true';
    }
    
    public function deleteFile() {
        global $input;
        
        echo "Deleting file: " . $input["path"];
        unlink($input["path"]);
        
        if (file_exists($input["path"] . ".bak")) {
            unlink($input["path"] . ".bak");
        }
    }
    
    private function listFilesInternal(&$items, $path, $basePathLength, $depth) {
        if ($dir = opendir($path)) {
            while (($curFile = readdir($dir)) !== false) {
                $baseName = $curFile;
                $curFile = $path . $curFile;
                
                if (strcmp($baseName, ".") != 0 && strcmp($baseName, "..") != 0) {
                    if (is_file($curFile) && substr($baseName, 0, 1) !== ".") {
                        $items[] = substr($curFile, $basePathLength);
                    } else if (is_dir($curFile) && strcmp(substr($baseName, 0, 1), ".") != 0) {
                        $this->listFilesInternal($items, $curFile . '/', $basePathLength, $depth + 1);
                    }
                }
            }
            
            closedir($dir);
        }
    }
    
    public function listFiles() {
        global $input;
        
        $items = array();
        $this->listFilesInternal($items, $input["path"], strlen($input["path"]), 0);
        sort($items, SORT_STRING); // |SORT_FLAG_CASE);
        echo json_encode($items);
    }
    
    public function listProjects() {
        global $PROJECT_PATH;
        
        $items = array();
        $items[] = dirname(__FILE__) . '/';
        if ($dir = opendir($PROJECT_PATH)) {
            $basePathLength = strlen($PROJECT_PATH);
            
            while (($folder = readdir($dir)) !== false) {
                $baseName = substr($folder, $basePathLength);
                
                if (is_dir($PROJECT_PATH . $folder) && $folder !== "." && $folder !== ".." && $baseName !== ".git") {
                    $projectFolder = $PROJECT_PATH . $folder;
                    
                    if (is_file($projectFolder . '.txt')) {
                        $folders = explode(';', file_get_contents($projectFolder . '.txt'));
                        for ($i = 0; $i < count($folders); $i++) {
                            $items[] = $projectFolder . '/' . $folders[$i] . '/';
                        }
                    }
                    else {
                        $items[] = $projectFolder . '/';
                    }
                }
            }
            
            closedir($dir);
        } else {
            echo 'Failed to open ' . $PROJECT_PATH;
        }
        echo json_encode($items);
    }
    
    public function loadFile() {
        global $input;
        
        $result = array();
        $result["path"] = $input["path"];
        $result["content"] = file_get_contents($input["path"]);
        echo json_encode($result);
    }
    
    public function authorize() {
        global $input;
        
        if (isset($_SESSION["auth"]) && $_SESSION["auth"] === true) {
            echo 'true';
        } else {
            if (isset($input["username"]) &&
                isset($input["password"]) &&
                $input["username"] == "username" && 
                $input["password"] == "password") {
                    
                $_SESSION["auth"] = true;
                echo 'true';
                
            } else {
                echo 'false';
            }
        }
    }
    
    public function createApi() {
        global $input;
        
        $info = new ReflectionClass($this);
        $methods = $info->getMethods();
        $js = 'function Api($http) {';
        $js .= 'var merge = function (data, o) { for (prop in data) { o[prop] = data[prop]; } return o; };';
        
        for ($i = 0; $i < count($methods); $i++) {
            $method = $methods[$i];
            $methodName = $method->name;
            $js .= 'this.' . $methodName . ' = function (data) {' .
                'return $http.post("api.php", merge(data, { "action": "' . $methodName . '" }));' .
            '};';
        }
        $js .= '}';
        header('Content-Type', 'text/javascript');
        echo $js;
    }
}

$action = "createApi";
$requireAuth = true;

if (isset($input["action"])) {
    $action = $input["action"];
    header("Content-Type", "application/json");
} else {
    header("Content-Type", "text/javascript");
}

$requireAuth = !($action == "createApi" || $action == "authorize");
$authorized = (isset($_SESSION["auth"]) && $_SESSION["auth"] == true);

if (($requireAuth && $authorized) || !$requireAuth) {
    $api = new ApiMethods();
    
    if (isset($input["path"])) {
        $path = realpath($input["path"]);
        if ($path === FALSE) {
            $path = $input["path"];
        }
        
        $found = false;
        for ($i = 0; $i < count($WHITELISTED_PATHS); $i++) {
            if (strpos($path, $WHITELISTED_PATHS[$i]) !== false) {
                $found = true;
                break;
            }
        }
        
        if (!$found) {
            echo '"Access Denied to: ' . $path . ' / ' . $input["path"] . '"';
            exit();
        }
    }
    
    $info = new ReflectionClass($api);
    
    $methods = $info->getMethods();
    
    for ($i = 0; $i < count($methods); $i++) {
        $method = $methods[$i];
        $methodName = $method->name;
        if (strcmp($action, $methodName) == 0) {
            $method->invoke($api);
            break;
        }
    }
} else {
    echo '"Access Denied"';
}

?>
