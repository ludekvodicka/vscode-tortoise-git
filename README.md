# TortoiseGit for VS Code

VS Code extension for [TortoiseGit](https://tortoisegit.org/) integration on Windows.

Built with the same architecture as [vscode-tortoise-svn](https://github.com/ludekvodicka/vscode-tortoise-svn).

## Installation

Not published on the Marketplace. Install manually:

```
code --install-extension tortoise-git-0.1.0.vsix
```

Or in VS Code: `Ctrl+Shift+P` > `Extensions: Install from VSIX...` > select the file.

### Build from source

```bash
git clone https://github.com/ludekvodicka/vscode-tortoise-git.git
cd vscode-tortoise-git
npm install
npm run compile
npx @vscode/vsce package --allow-missing-repository
code --install-extension tortoise-git-*.vsix
```

## Requirements

**Windows only.** Requires [TortoiseGit](https://tortoisegit.org/) installed. The extension auto-detects `TortoiseGitProc.exe` from the registry. If detection fails, set `TortoiseGit.tortoiseGitProcExePath` in VS Code settings.

## Features

### Context Menu

Right-click in the explorer or editor shows a **TortoiseGit** submenu:

- **Pull**, **Push**, **Commit**, **Check for Modifications**, **Log**, **Diff**
- **Revert**, **Add**, **Stash Save**, **Blame**
- **Git ... (Select Action)** — full action picker for the clicked item
- **Workspace Git ... (Select Action)** — action picker for the workspace root
- **TortoiseGit: Settings**

All actions operate on the right-clicked item.

### Keybindings

| Shortcut | Command |
|----------|---------|
| `Alt+G U` | Git Pull |
| `Alt+G P` | Git Push |
| `Alt+G C` | Git Commit |
| `Alt+G L` | Git Log |
| `Alt+G R` | Git Revert |
| `Alt+G D` | Git Diff |
| `Alt+G F` | Git Check for Modifications |
| `Alt+G S` | Git ... (Select Action) |
| `Alt+G M` | Git ... (Select Path) |

### Status Bar

A clickable **TGit** item in the status bar opens "Check for Modifications".

### Multi-root Workspace

Commands automatically detect which workspace folder the target file belongs to.

### All Commands

**Workspace** (operate on workspace root): Pull, Push, Fetch, Commit, Revert, Log, Diff, Merge, Check for Modifications, Repository Browser, Switch/Checkout, Resolve, Stash Save, Stash Pop, Revision Graph, Tag, Branch, Rebase, Cleanup, RefLog, Browse References, Settings

**File** (operate on active file): Commit, Revert, Log, Add, Blame, Diff, Check for Modifications, Resolve, Rename, Remove

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `TortoiseGit.autoCloseUpdateDialog` | `false` | Auto-close dialog when no errors/conflicts |
| `TortoiseGit.tortoiseGitProcExePath` | `""` | Manual path to TortoiseGitProc.exe (auto-detected if empty) |
| `TortoiseGit.showPath.exclude` | `["**/{node_modules,bower_components}/**"]` | Glob patterns to exclude from path picker |

## Change Log

### Version 0.1.0
* Initial release
* All TortoiseGit commands: pull, push, fetch, commit, revert, log, diff, merge, check for modifications, repository browser, switch/checkout, resolve, stash save/pop, revision graph, tag, branch, rebase, cleanup, reflog, browse references, settings
* File commands: commit, revert, log, add, blame, diff, check for modifications, resolve, rename, remove
* TortoiseGit submenu in explorer and editor right-click context menus
* Workspace and file-level action pickers
* Status bar item (click opens Check for Modifications)
* Multi-root workspace support
* Auto-detect TortoiseGitProc.exe from Windows registry
* Keybindings with `Alt+G` prefix

## License

[MIT](https://github.com/ludekvodicka/vscode-tortoise-git/blob/master/LICENSE)
