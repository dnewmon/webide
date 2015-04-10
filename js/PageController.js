editorApp.controller('PageController', function ($scope, $http, ActionsProvider, SharedPathService) {
    var api = new Api($http);
    
    setInterval(function () {
        api.ping();
    }, 20 * 1000);
    
    $('.dropdown-toggle').dropdown();
    
    $scope.currentFile = '';
    $scope.dirtyFlag = false;
    $scope.showLogin = true;
    $scope.files = [];
    $scope.allFiles = [];
    $scope.allFolders = [];
    $scope.actions = [];
    $scope.terminalOutput = '';
    $scope.actionSearch = '';
    $scope.filteredActions = [];
    
    $scope.promptTitle = '';
    $scope.promptMessage = '';
    $scope.promptValue = '';
    $scope.promptPlaceholder = '';
    $scope.promptAutoComplete = '';
    
    $scope.editor = ace.edit("editor");
    $scope.editor.setTheme("ace/theme/xcode");
    $scope.editor.setShowPrintMargin(false);
    $scope.editor.setShowInvisibles(true);
    $scope.editor.getSession().setUseSoftTabs(true);
    $scope.editor.getSession().setTabSize(4);
    
    $scope.editor.getSession().on('change', function () {
        var name = $scope.currentFile.substr($scope.currentFile.lastIndexOf('/') + 1);
    	document.title = name + '*';
    	$scope.dirtyFlag = true;
    });
    
    SharedPathService.watchForChanges(function () {
        $scope.listFiles().then(function () {
            $scope.loadFile($scope.files[0]);
        });
    });
    
    ActionsProvider.addProvider(function () { }, 'file', function (action) {
        $scope.loadFile(action.path);
    });
    
    ActionsProvider.addProvider(function () { }, 'folder', function (action) {
        SharedPathService.setCurrentPath(SharedPathService.getCurrentPath() + action.path + "/");
    });
    
    ActionsProvider.addProvider(function () { }, 'import', function (action) {
        $('body').append($('<script>').attr('src', action.path));
    });
    
    ActionsProvider.addProvider(function () { }, 'switch-project', function (action) {
        SharedPathService.setCurrentPath(action.path);
    });
    
    ActionsProvider.addProvider(function (actions) {
        actions.push({ text: 'No Action', type: 'nothing' });
        actions.push({ text: 'New Editor', type: 'function', reference: $scope.newEditor });
        actions.push({ text: 'Save File', type: 'function', reference: $scope.saveFile });
        actions.push({ text: 'Reopen/Reload File', type: 'function', reference: $scope.reopen });
        actions.push({ text: 'Rename/Move File', type: 'function', reference: $scope.renameFile });
        actions.push({ text: 'Create File', type: 'function', reference: $scope.createFile });
        actions.push({ text: 'Delete File', type: 'function', reference: $scope.deleteFile });
        actions.push({ text: 'Execute Expression', type: 'function', reference: $scope.executeExpression });
        actions.push({ text: 'Execute JavaScript', type: 'function', reference: $scope.executeJavaScript });
        actions.push({ text: 'Change Folder', type: 'function', reference: $scope.changeFolder });
        actions.push({ text: 'Command Line / Terminal', type: 'function', reference: $scope.showTerminal });
        actions.push({ text: 'Reload Actions / File List', type: 'function', reference: $scope.listFiles });
        actions.push({ text: 'Convert to Soft-Tabs', type: 'function', reference: $scope.transformTabs });
        actions.push({ text: 'Delete Backup Files', type: 'function', reference: $scope.deleteBackupFiles });
        actions.push({ text: 'Upload File', type: 'function', reference: $scope.showUploadDialog });
        actions.push({ text: 'Logout', type: 'function', reference: $scope.logout });
    }, 'function', function (action) {
        action.reference();
    });
    
    ActionsProvider.addProvider(function (actions) {
        actions.push({ text: 'PANIC BUTTON!', type: 'panic' });
    }, 'panic', function(action) {
        if (confirm('ARE YOU SURE? THIS WILL REVERT API.PHP!!')) {
            $http.get('panic.php').then(function (resp) {
                console.log(resp);
            });
        }
    });
    
    /*ActionsProvider.addProvider(function (actions) {
        var themes = ["ace/theme/ambiance", "ace/theme/chaos", "ace/theme/chrome", "ace/theme/clouds", "ace/theme/clouds_midnight", "ace/theme/cobalt", 
            "ace/theme/crimson_editor", "ace/theme/dawn", "ace/theme/dreamweaver", "ace/theme/eclipse", "ace/theme/github", "ace/theme/idle_fingers", 
            "ace/theme/katzenmilch", "ace/theme/kr_theme", "ace/theme/kuroir", "ace/theme/merbivore", "ace/theme/merbivore_soft", "ace/theme/mono_industrial", 
            "ace/theme/monokai", "ace/theme/pastel_on_dark", "ace/theme/solarized_dark", "ace/theme/solarized_light", "ace/theme/terminal", "ace/theme/textmate",
            "ace/theme/tomorrow", "ace/theme/tomorrow_night", "ace/theme/tomorrow_night_blue", "ace/theme/tomorrow_night_bright", "ace/theme/tomorrow_night_eighties", 
            "ace/theme/twilight", "ace/theme/vibrant_ink", "ace/theme/xcode"];
        
        var i;
        for (i = 0; i < themes.length; i++) {
            actions.push({
                text: 'Switch theme ' + themes[i],
                type: 'theme',
                name: themes[i]
            });
        }
    }, 'theme', function (action) {
        $scope.editor.setTheme(action.name);
    });*/
    
    ActionsProvider.addProvider(function (actions) {
        var bookmarks = [
            "http://php.net/manual/en/",
            "http://underscorejs.org/",
            "https://angularjs.org/",
            "http://getbootstrap.com/",
            "http://api.jquery.com/",
            "http://devdocs.io/",
            "http://regexpal.com/",
            "http://wicky.nillia.ms/enquire.js/",
            "https://github.com/ajaxorg/ace/wiki/Default-Keyboard-Shortcuts"
        ];
        
        for (i = 0; i < bookmarks.length; i++) {
            actions.push({
                text: 'Open ' + bookmarks[i],
                type: 'link',
                url: bookmarks[i]
            });
        }
    }, 'link', function (action) {
        window.open(action.url, "_blank", "width=1024,height=600,menubar=no,toolbar=no");
    });
    
    $scope.showUploadDialog = function() {
        $scope.uploadPath = SharedPathService.getCurrentPath();
        $('#uploadDialog').modal('show');
        
        setTimeout(function () {
            $('#uploadDialog input')[0].focus();
        }, 200);
    };
    
    // Ctrl+S Handler
    $scope.onKeyDown = function (e) {
        if (e.keyCode == 83 && e.ctrlKey) {
            e.preventDefault();
            $scope.saveFile();
        }
        
        if ((e.keyCode == 32 || e.keyCode == 73) && e.ctrlKey) {
            e.preventDefault();
            $scope.actionSearch = '';
            
            var filteredActions = $scope.getFilteredActions();
            _.each(filteredActions, function (action, index) { action.active = (index === 0); });
            
            $('#actionDialog').modal('show');
            $('#actionDialog .modal-footer input').focus();
        }
    };
    
    $scope.confirmUnsaved = function () {
        if ($scope.dirtyFlag === true) {
            return confirm('You have unsaved changes. Are your sure you want to continue?');
        }
        
        return true;
    };
    
    $scope.newEditor = function() {
        window.open("editor.html", "_blank");
    };
    
    $scope.saveFile = function () {
        $scope.editor.setReadOnly(true);
        
        api.saveFile({
            'path': SharedPathService.getCurrentPath() + $scope.currentFile,
            'content': $scope.editor.getSession().getValue()
        }).then(function (response) {
            var name = $scope.currentFile.substr($scope.currentFile.lastIndexOf('/') + 1);
        	document.title = name;
            $scope.editor.setReadOnly(false);
            $scope.editor.focus();
            $scope.dirtyFlag = false;
        });
    };
    
    $scope.executeJavaScript = function () {
        eval($scope.editor.getSession().getValue());
    };
    
    $scope.transformTabs = function() {
        var content = $scope.editor.getValue();
        content = content.replace(/\t/g, '    ');
        $scope.editor.setValue(content, -1);
    };
    
    $scope.loadFile = function (path) {
        if ($scope.confirmUnsaved()) {
            $scope.editor.setReadOnly(true);
            $scope.editor.setValue('', -1);
            
            document.title = 'Loading ' + path + "...";
            
            api.loadFile({
                'path': SharedPathService.getCurrentPath() + path
            }).then(function (response) {
                var data = response.data;
                
                $scope.currentFile = path;
                $scope.editor.setValue(data.content, -1);
                
                if (path.indexOf('.js') != -1) {
                    $scope.editor.getSession().setMode("ace/mode/javascript");
                } else if (path.indexOf('.php') != -1) {
                    $scope.editor.getSession().setMode("ace/mode/php");
                } else if (path.indexOf('.java') != -1) {
                    $scope.editor.getSession().setMode("ace/mode/java");
                } else if (path.indexOf('.html') != -1) {
                    $scope.editor.getSession().setMode("ace/mode/html");
                } else if (path.indexOf('.css') != -1 || path.indexOf('.less') != -1 || path.indexOf('.scss') != -1) {
                    $scope.editor.getSession().setMode('ace/mode/css');
                } else if (path.indexOf('.xml') != -1 || 
                    path.indexOf('.config') != -1 ||
                    data.content.indexOf('<?xml') === 0) {
                    
                    $scope.editor.getSession().setMode('ace/mode/xml');
                } else {
                    $scope.editor.getSession().setMode('ace/mode/text');
                }
                
                var name = $scope.currentFile.substr($scope.currentFile.lastIndexOf('/') + 1);
            	document.title = name;
                $scope.editor.getSession().getUndoManager().reset();
                $scope.editor.setReadOnly(false);
                $scope.editor.focus();
                $scope.dirtyFlag = false;
            });
        }
    };
    
    $scope.renameFile = function() {
        if ($scope.confirmUnsaved()) {
            $scope.prompt("Rename File", "Enter new file name", $scope.currentFile, 'Enter new file name', function (newpath) {
                if (newpath !== '' && newpath != $scope.currentFile) {
                    api.renameFile({
                        'path': SharedPathService.getCurrentPath() + $scope.currentFile,
                        'newpath': SharedPathService.getCurrentPath() + newpath
                    }).then(function (response) {
                        $scope.listFiles();
                        $scope.loadFile(newpath);
                    });
                }
            });
        }
    };
    
    $scope.createFile = function () {
        $scope.prompt('Create File', 'Enter file name', '', 'Enter file name', function (name) {
            if (name !== '') {
                api.saveFile({
                    'path': SharedPathService.getCurrentPath() + name,
                    'content': ''
                }).then(function (response) {
                    $scope.listFiles();
                    $scope.loadFile(name);
                });
            }
        });
    };
    
    $scope.deleteFile = function () {
        if (confirm('Are you sure you want to delete this file?')) {
            api.deleteFile({
                'path': SharedPathService.getCurrentPath() + $scope.currentFile
            }).then(function (response) {
                $scope.listFiles().then(function () {
                    $scope.loadFile($scope.files[0]);
                });
            });
        }
        
        return null;
    };
    
    $scope.reopen = function () {
        $scope.loadFile($scope.currentFile);
    };
    
    $scope.deleteBackupFiles = function () {
        if (confirm('Are you sure?')) {
            _.each(_.filter($scope.allFiles, function (file) { return file.indexOf(".bak") !== -1; }), 
                function (backupFile) {
                
                api.deleteFile({
                    'path': SharedPathService.getCurrentPath() + backupFile
                }).then(function (response) {
                    $scope.listFiles().then(function () {
                        $scope.loadFile($scope.files[0]);
                    });
                });
            });
        }
    };
    
    $scope.listFiles = function () {
        return api.listFiles({ 
            'path': SharedPathService.getCurrentPath()
        }).then(function (response) {
            var binaryFileFormats = [
                'bak',
                'png', 'jpg', 'jpeg',
                'eot', 'woff', 'ttf', 'svg',
                'class', 'tar', 'jar', 'war'
            ];
            
            $scope.allFiles = response.data;
            
            $scope.allFolders = _.keys(_.groupBy($scope.allFiles, function (path) {
                var folder = path.lastIndexOf('/');
                return path.substr(0, folder);
            }));

            $scope.files = _.filter($scope.allFiles, function (file) {
                var extIndex = file.lastIndexOf('.');
                if (extIndex !== -1) {
                    var ext = file.substr(extIndex + 1);
                    return binaryFileFormats.indexOf(ext) === -1;
                }
            });
            
            $scope.reloadActions();
            
            var i;
            
            for (i = 0; i < $scope.allFolders.length; i++) {
                $scope.actions.push({
                    text: 'Change to Folder ' + $scope.allFolders[i],
                    type: 'folder',
                    path: $scope.allFolders[i]
                });
            }
            
            for (i = 0; i < $scope.files.length; i++) {
                $scope.actions.push({
                    text: 'Open ' + $scope.files[i],
                    type: 'file',
                    path: $scope.files[i]
                });
                
                if ($scope.files[i].indexOf('plugins/') === 0) {
                    $scope.actions.push({
                        text: 'Import ' + $scope.files[i],
                        type: 'import',
                        path: $scope.files[i]
                    });
                }
            }
            
            $scope.actions.sort(function (a, b) {
                var order = ['theme', 'function', 'import', 'switch-project', 'link', 'file', 'nothing'];
                return order.indexOf(b.type) - order.indexOf(a.type);
            });
            
            api.listProjects({}).then(function (response) {
                var projects = response.data;
                for (var i = 0; i < projects.length; i++) {
                    $scope.actions.push({
                        text: 'Project ' + projects[i],
                        type: 'switch-project',
                        path: projects[i]
                    });
                }
            });
        });
    };
    
    $scope.reloadActions = function () {
        $scope.actions = [];
        ActionsProvider.populateActions($scope.actions);
    };
    
    $scope.executeAction = function (action) {
        ActionsProvider.executeAction(action);
    };
    
    $scope.showTerminal = function () {
        $('#terminalDialog').modal('show');
        
        setTimeout(function () {
            $('#terminalDialog input').focus();
        }, 200);
    };
    
    $scope.executeTerminalCommand = function () {
        $scope.terminalOutput += $scope.terminalCommand + '\n';
        api.executeTerminalCommand({
            'path': SharedPathService.getCurrentPath(),
            'command': $scope.terminalCommand
        }).then(function (response) {
            $scope.terminalOutput += response.data;
        });
        
        $scope.terminalCommand = '';
    };
    
    $scope.changeFolder = function () {
        $scope.prompt('Change Folder', 'Enter the new folder path', SharedPathService.getCurrentPath(), SharedPathService.getCurrentPath(), function (newPath) {
            SharedPathService.setCurrentPath(newPath);
        });
    };
    
    $scope.authorize = function () {
        api.authorize({ 
            'username': $scope.uname, 
            'password': $scope.pass
        }).then(function (response) {
            if (response.data === 'true') {
                api.getCurrentFolder().then(function (response) {
                    SharedPathService.setCurrentPath(response.data + '/');
                });
                
                $scope.showLogin = false;
            }
        });
    };
    
    $scope.executeActiveAction = function (event) {
        event.preventDefault();
        
        var action = _.findWhere($scope.filteredActions, { active: true });
        $scope.executeAction(action);
        $('#actionDialog').modal('hide');
    };
    
    $scope.getFilteredActions = function () {
        var filteredActions = [];
        
        _.each($scope.actions, function (action) {
            var added = false;
            _.each(_.keys(action), function (key) {
                var value = action[key] + '';
                if ($scope.isActionMatch(value, $scope.actionSearch)) {
                    if (!added) {
                        filteredActions.push(action);
                        added = true;
                    }
                }
            });
        });
        
        return filteredActions;
    }

    $scope.$watch('actionSearch', function (newValue) {
        var filteredActions = $scope.getFilteredActions();
        
        _.each(filteredActions, function (action, index) { action.active = (index === 0); });
    });
    
    $scope.isActionMatch = function (actual, expected) {
        actual += '';
        expected += '';
        
        actual = actual.toLowerCase();
        expected = expected.toLowerCase();
        
        var terms = expected.split(" ");
        for (var i = 0; i < terms.length; i++) {
            if (actual.indexOf(terms[i]) === -1) {
                return false;
            }
        }
        
        return true;
    };
    
    $scope.onActionKeyDown = function (event) {
        var filteredActions = $scope.getFilteredActions();
        var idx;
        
        if (event.keyCode == 38) { // Up Arrow Key
            _.each(filteredActions, function (a, index) {
                if (a.active) {
                    idx = index;
                    a.active = false;
                }
            });
            
            if (idx > 1) {
                idx--;
                filteredActions[idx].active = true;
            }
            else {
                filteredActions[0].active = true;
            }
            
            event.preventDefault();
        } else if (event.keyCode == 40) { // Down Arrow Key
            _.each(filteredActions, function (a, index) {
                if (a.active) {
                    idx = index;
                    a.active = false;
                }
            });
            
            var maxIndex = Math.min(19, filteredActions.length - 1);
            
            if (idx < maxIndex) {
                idx++;
                filteredActions[idx].active = true;
            }
            else {
                filteredActions[maxIndex].active = true;
            }
            
            event.preventDefault();
        }
        
        var items = $('#actionDialog .list-group-item');
        items[idx].scrollIntoView();
    };
    
    $scope.logout = function () {
        api.logout({}).then(function (response) {
            $scope.showLogin = true;
        });
    };
    
    $scope.executeExpression = function () {
        $scope.prompt('Expression', 'Enter Expression', '', '$text, $scope', function (value) {
            value = 'function evalExpression($text, $scope) {' + value + '};';
            eval(value);
            evalExpression($scope.editor.getSession().getValue(), $scope);
        });
    };
    
    $scope.prompt = function (title, message, value, placeholder, callback) {
        $scope.promptTitle = title;
        $scope.promptMessage = message;
        $scope.promptValue = value;
        $scope.promptPlaceholder = placeholder;
        $scope.promptAutoComplete = value;
        $scope.promptCallback = callback;
        
        $('#promptDialog').modal('show');
        $('#promptDialog input').focus();
    };
    
    $scope.submitPrompt = function () {
        $('#promptDialog').modal('hide');
        
        $scope.promptCallback($scope.promptValue);
    };
    
    $scope.authorize();
})
.service('SharedPathService', function() {
    return {
        _currentPath: '',
        _handlers: [],
        
        getCurrentPath: function () {
            return this._currentPath;
        },
        
        setCurrentPath: function (value) { 
            this._currentPath = value;
            
            for (var i = 0; i < this._handlers.length; i++) {
                this._handlers[i]();
            }
        },
        
        watchForChanges: function (handler) {
            this._handlers.push(handler);
        }
    };
})
.service('ActionsProvider', function () {
    return {
        providers: [],
        providerHandlers: [],
        
        addProvider: function (provider, type, handler) {
            this.providers.push(provider);
            this.providerHandlers.push({ 'type': type, 'handler': handler });
        },
        
        populateActions: function (actions) {
            for (var i = 0; i < this.providers.length; i++) {
                this.providers[i](actions);
            }
        },
        
        executeAction: function (action) {
            var providerHandler = _.findWhere(this.providerHandlers, { 'type': action.type });
            providerHandler.handler(action);
        }
    };
})
.controller('TerminalController', function ($scope, $http, SharedPathService) {
    var api = new Api($http);
    
    $scope.currentPath = SharedPathService.getCurrentPath();
    $scope.terminalOutput = '';
    $scope.terminalCommand = '';
    $scope.terminalCommands = [];
    $scope.commandIndex = -1;
    
    SharedPathService.watchForChanges(function () {
        $scope.currentPath = SharedPathService.getCurrentPath();
    });
    
    $scope.onKeyDown = function (event) {
        if (event.keyCode == 38) { // Up Arrow Key
            if ($scope.commandIndex == -1) {
                $scope.commandIndex = $scope.terminalCommands.length - 1;
            } else if ($scope.commandIndex > 0) {
                $scope.commandIndex--;
            }
            
            $scope.terminalCommand = $scope.terminalCommands[$scope.commandIndex];
        } else if (event.keyCode == 40) { // Down Arrow Key
            if ($scope.commandIndex == -1) {
                $scope.commandIndex = $scope.terminalCommands.length - 1;
            } else if ($scope.commandIndex < $scope.terminalCommands.length - 1) {
                $scope.commandIndex++;
            }
            
            $scope.terminalCommand = $scope.terminalCommands[$scope.commandIndex];
        }
    };
    
    $scope.executeTerminalCommand = function () {
        if ($scope.terminalCommands.length > 0) {
            if ($scope.terminalCommands[$scope.terminalCommands.length - 1] != $scope.terminalCommand) {
                $scope.terminalCommands.push($scope.terminalCommand);
            }
        } else {
            $scope.terminalCommands.push($scope.terminalCommand);
        }
        
        $scope.commandIndex = -1;
        $scope.terminalOutput += $scope.terminalCommand + '\n';
        
        if ($scope.terminalCommand.substr(0, 3) == 'cd ') {
            api.combinePath({
                'path1': $scope.currentPath,
                'path2': $scope.terminalCommand.substr(3)
            }).then (function (resp) {
                $scope.currentPath = resp.data + '/';
            });
        }
        else if ($scope.terminalCommand == 'clear') {
            $scope.terminalOutput = '';
        }
        else if ($scope.terminalCommand.substr(0, 2) == '& ') {
            api.executeBackgroundTerminalCommand({
                'path': $scope.currentPath,
                'command': $scope.terminalCommand.substr(2)
            }).then(function (response) {
                $scope.terminalOutput += response.data;
            });
        }
        else {
            api.executeTerminalCommand({
                'path': $scope.currentPath,
                'command': $scope.terminalCommand
            }).then(function (response) {
                $scope.terminalOutput += response.data;
            });
        }
        
        $scope.terminalCommand = '';
    };
    
})
.directive('dnPlaceHolderAutoComplete', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            element.on('keydown', function (event) {
                if (event.keyCode === 39 && attrs.dnPlaceHolderAutoComplete !== '') {
                    element.val(scope[attrs.dnPlaceHolderAutoComplete]);
                }
            });
        }
    };
})
.directive('dnScrollBottom', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            scope.$watch(attrs.dnScrollBottom, function(value) {
                element.scrollTop(90000);
            });
            
        }
    };
});
