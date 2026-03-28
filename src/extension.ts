'use strict';
import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import glob = require('glob');

const DIRECTORY_ACTIONS: string[] = [
    'pull', 'push', 'fetch', 'commit', 'revert', 'log', 'diff',
    'merge', 'repostatus', 'repobrowser', 'switch', 'resolve',
    'stashsave', 'stashpop', 'revisiongraph', 'tag', 'branch',
    'rebase', 'cleanup', 'reflog', 'refbrowse', 'settings'
];

const FILE_ACTIONS: string[] = [
    'commit', 'revert', 'log', 'add', 'blame', 'diff',
    'repostatus', 'resolve', 'rename', 'remove'
];

interface GitQuickPickItem extends vscode.QuickPickItem {
    action?: string;
    path: string;
}

function getWorkspaceRootForPath(fsPath?: string): string | undefined {
    if (fsPath) {
        let folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(fsPath));
        if (folder) {
            return folder.uri.fsPath;
        }
    }
    let activeUri = vscode.window.activeTextEditor?.document.uri;
    if (activeUri) {
        let folder = vscode.workspace.getWorkspaceFolder(activeUri);
        if (folder) {
            return folder.uri.fsPath;
        }
    }
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

export function activate(context: vscode.ExtensionContext) {
    let tortoiseCommand = new TortoiseCommand();

    DIRECTORY_ACTIONS.forEach((action) => {
        let disposable = vscode.commands.registerCommand(`workspace tortoise-git ${action}`, (uri?: vscode.Uri) => {
            tortoiseCommand.exec(action, uri?.fsPath || getWorkspaceRootForPath());
        });
        context.subscriptions.push(disposable);
    });

    FILE_ACTIONS.forEach((action) => {
        let disposable = vscode.commands.registerCommand(`file tortoise-git ${action}`, (uri?: vscode.Uri) => {
            let filePath = uri?.fsPath || vscode.window.activeTextEditor?.document.uri.fsPath;
            if (!filePath) {
                vscode.window.showWarningMessage('This command requires an open file in the text editor.');
                return;
            }
            tortoiseCommand.exec(action, filePath);
        });
        context.subscriptions.push(disposable);
    });

    let disposableNeedChoose = vscode.commands.registerCommand('tortoise-git ...', (uri: vscode.Uri) => {
        let uriInfo = new UriInfo(uri?.fsPath);
        let actionQuickPickItems = uriInfo.getActionQuickPickItem();
        vscode.window.showQuickPick<GitQuickPickItem>(actionQuickPickItems).then((quickPickItem) => {
            if (quickPickItem) {
                tortoiseCommand.exec(quickPickItem.action, quickPickItem.path);
            }
        });
    });
    context.subscriptions.push(disposableNeedChoose);

    let disposableDropdown = vscode.commands.registerCommand('tortoise-git ...(select path)', () => {
        let rootPath = getWorkspaceRootForPath();
        if (!rootPath) {
            vscode.window.showWarningMessage('No workspace folder open.');
            return;
        }
        getQuickPickItemsFromDir(rootPath).then(quickPickItems => {
            return vscode.window.showQuickPick<GitQuickPickItem>(quickPickItems);
        }).then(selectedPath => {
            if (!selectedPath) {
                return;
            }
            let uriInfo = new UriInfo(selectedPath.path);
            let actionQuickPickItems = uriInfo.getActionQuickPickItem();
            vscode.window.showQuickPick<GitQuickPickItem>(actionQuickPickItems).then((action) => {
                if (action) {
                    tortoiseCommand.exec(action.action, action.path);
                }
            });
        });
    });
    context.subscriptions.push(disposableDropdown);

    // Context menu commands — short titles, URI-aware
    const CONTEXT_ACTIONS: { action: string, id: string }[] = [
        { action: 'pull', id: 'tortoise-git.ctx.pull' },
        { action: 'push', id: 'tortoise-git.ctx.push' },
        { action: 'commit', id: 'tortoise-git.ctx.commit' },
        { action: 'repostatus', id: 'tortoise-git.ctx.repostatus' },
        { action: 'log', id: 'tortoise-git.ctx.log' },
        { action: 'diff', id: 'tortoise-git.ctx.diff' },
        { action: 'revert', id: 'tortoise-git.ctx.revert' },
        { action: 'add', id: 'tortoise-git.ctx.add' },
        { action: 'stashsave', id: 'tortoise-git.ctx.stashsave' },
        { action: 'blame', id: 'tortoise-git.ctx.blame' },
    ];
    CONTEXT_ACTIONS.forEach(({ action, id }) => {
        let disposable = vscode.commands.registerCommand(id, (uri?: vscode.Uri) => {
            tortoiseCommand.exec(action, uri?.fsPath || getWorkspaceRootForPath(uri?.fsPath));
        });
        context.subscriptions.push(disposable);
    });

    // Workspace-level action picker
    let disposableWorkspaceCtx = vscode.commands.registerCommand('tortoise-git.ctx.workspace', (uri?: vscode.Uri) => {
        let rootPath = getWorkspaceRootForPath(uri?.fsPath);
        if (!rootPath) {
            vscode.window.showWarningMessage('No workspace folder open.');
            return;
        }
        let uriInfo = new UriInfo(rootPath);
        let actionQuickPickItems = uriInfo.getActionQuickPickItem();
        vscode.window.showQuickPick<GitQuickPickItem>(actionQuickPickItems).then((quickPickItem) => {
            if (quickPickItem) {
                tortoiseCommand.exec(quickPickItem.action, quickPickItem.path);
            }
        });
    });
    context.subscriptions.push(disposableWorkspaceCtx);

    // TortoiseGit settings dialog
    let disposableSettings = vscode.commands.registerCommand('tortoise-git.settings', () => {
        tortoiseCommand.exec('settings', '');
    });
    context.subscriptions.push(disposableSettings);

    // Status bar item — click to open Check for Modifications
    let statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    statusBarItem.text = '$(git-branch) TGit';
    statusBarItem.tooltip = 'TortoiseGit: Check for Modifications';
    statusBarItem.command = 'workspace tortoise-git repostatus';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
}

export function deactivate() {
}

function getQuickPickItemsFromDir(dirPath: string): Promise<GitQuickPickItem[]> {
    return new Promise<GitQuickPickItem[]>((resolve, reject) => {
        let quickPickItems: GitQuickPickItem[] = [{
            label: dirPath,
            description: dirPath,
            path: dirPath
        }];
        let ignore: any = vscode.workspace.getConfiguration('TortoiseGit').get('showPath.exclude');
        let options: any = { cwd: dirPath, mark: true };
        if (Array.isArray(ignore) && ignore.length > 0) {
            options.ignore = ignore;
        }
        glob('**', options, (err, paths) => {
            if (err) {
                reject(err);
                return;
            }
            paths.forEach(file => {
                let lastSep = file.lastIndexOf('/') + 1;
                if (lastSep === file.length) {
                    lastSep = 0;
                }
                quickPickItems.push({
                    label: file.substring(lastSep),
                    description: file.substring(0, lastSep),
                    path: path.join(dirPath, file)
                });
            });
            resolve(quickPickItems);
        });
    });
}

class UriInfo {
    path: string;
    isDirectory: boolean;
    isFile: boolean;

    constructor(uri?: string) {
        this.path = uri || getWorkspaceRootForPath() || '';
        let stat: fs.Stats = fs.statSync(this.path);
        this.isFile = stat.isFile();
        this.isDirectory = stat.isDirectory();
    }

    public getActionQuickPickItem(): GitQuickPickItem[] {
        let actions: string[];
        if (this.isFile) {
            actions = FILE_ACTIONS;
        } else {
            actions = DIRECTORY_ACTIONS;
        }
        return actions.map<GitQuickPickItem>(action => ({
            label: 'git ' + action,
            description: this.path,
            path: this.path,
            action: action
        }));
    }
}

class TortoiseCommand {
    private tortoiseGitProcExePath: string;

    constructor() {
        this.tortoiseGitProcExePath = this._getTortoiseGitProcExePath();
    }

    public tortoiseGitProcExePathIsExist(): boolean {
        try {
            let stat = fs.statSync(this.tortoiseGitProcExePath);
            return stat.isFile();
        } catch (err) {
            return false;
        }
    }

    private _getTortoiseGitProcExePath(): string {
        let tortoiseGitProcExePath = vscode.workspace.getConfiguration('TortoiseGit').get<string>('tortoiseGitProcExePath') || '';
        if (!tortoiseGitProcExePath) {
            try {
                let result = child_process.execSync(
                    'reg query HKEY_LOCAL_MACHINE\\SOFTWARE\\TortoiseGit /v ProcPath'
                ).toString();
                let match = result.match(/REG_SZ\s+(.+\.exe)/i);
                if (match) {
                    tortoiseGitProcExePath = match[1].trim();
                }
            } catch (error) {
                // TortoiseGit not found in registry
            }
        }
        return tortoiseGitProcExePath;
    }

    private _getTargetPath(fileUri: string): string {
        if (fileUri) {
            return fileUri;
        }
        if (vscode.window.activeTextEditor?.document) {
            return vscode.window.activeTextEditor.document.fileName;
        }
        return getWorkspaceRootForPath() || '';
    }

    private _getCommand(action: string, fileUri: string): string {
        let closeonend = vscode.workspace.getConfiguration('TortoiseGit').get('autoCloseUpdateDialog') ? 3 : 0;
        let targetPath = this._getTargetPath(fileUri);
        return `"${this.tortoiseGitProcExePath}" /command:${action} /path:"${targetPath}" /closeonend:${closeonend}`;
    }

    exec(action: string, fileUri: string) {
        let fileSave: Thenable<boolean> | Promise<void>;
        if (action === 'revert') {
            fileSave = vscode.workspace.saveAll();
        } else {
            fileSave = Promise.resolve();
        }

        fileSave.then(() => {
            child_process.exec(this._getCommand(action, fileUri), (error) => {
                if (error && !this.tortoiseGitProcExePathIsExist()) {
                    vscode.window.showErrorMessage(
                        'TortoiseGitProc.exe not found. Set "TortoiseGit.tortoiseGitProcExePath" in settings and restart VS Code.'
                    );
                }
            });
        });
    }
}
