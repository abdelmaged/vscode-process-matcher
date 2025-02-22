import * as vscode from 'vscode';
const ps = require('ps-node');

interface MatchOptions {
  program: string;
  args: string[];
}

interface ProcessInfo {
  pid: number;
  command: string;
  arguments: string[];
}

function getProcessInfo(options: MatchOptions): Promise<ProcessInfo[] | null> {
  return new Promise(resolve => {
    ps.lookup({
      command: options.program,
      arguments: options.args
    }, function (err: any, results: any[]) {
      if (err) {
        resolve(null);
      }
      resolve(results);
    });
  });
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('process-matcher.match', async (options) => {
    const pss = await getProcessInfo(options);

    if (!pss || pss.length === 0) {
      vscode.window.showWarningMessage(`No process matched ${JSON.stringify(options)}`);
      return null;
    }

    if (pss.length === 1) {
      const args = pss[0].arguments ? pss[0].arguments.join(' ') : '';
      vscode.window.showInformationMessage(`Matched process with pid '${pss[0].pid}'. Command: '${pss[0].command} ${args}'`);
      return pss[0].pid;
    }

    const quickPickItems: vscode.QuickPickItem[] = pss.map((ps) => {
      const qp_item: vscode.QuickPickItem = {
        label: ps.command,
        detail: ps.pid.toString()
      };
      if (ps.arguments) {
        qp_item.description = ps.arguments.join(' ');
      }
      return qp_item;
    });

    const pickedItem = await vscode.window.showQuickPick(quickPickItems, {
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (pickedItem) {
      return pickedItem.detail;
    }

    return null;
  });

  context.subscriptions.push(disposable);
}

export function deactivate() { }
