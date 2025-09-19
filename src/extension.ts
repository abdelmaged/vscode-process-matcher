import * as vscode from 'vscode';
import find from 'find-process';

interface MatchOptions {
  program: string;
  args: string[];
}

interface ProcessInfo {
  pid: number;
  command: string;
  arguments: string[];
}

async function getProcessInfo(options: MatchOptions): Promise<ProcessInfo[]> {
  try {
    let processes = await find('name', options.program);
    // console.log(`Initial Match: '${options.program}', ` + JSON.stringify(processes, null, 2) + "\n");

    // Filter by name
    processes = processes.filter((proc) => {
      return proc.name.match(options.program) || proc.cmd.startsWith(options.program) ||
        (process.platform === "win32" && proc.cmd.startsWith(options.program.replace(/\\\\/g, '\\')));
    });
    // console.log(`After Name Filter: '${options.program}', ` + JSON.stringify(processes, null, 2) + "\n");

    // Filter by args if provided
    if (options.args && options.args.length > 0) {
      processes = processes.filter((proc) => {
        return options.args.every(arg => proc.cmd.match(arg));
      });
    }
    // console.log(`After Args Filter: '${options.args}', ` + JSON.stringify(processes, null, 2) + "\n");

    // Convert to ProcessInfo format
    return processes.map((proc) => ({
      pid: proc.pid,
      command: proc.name,
      arguments: proc.cmd ? proc.cmd.split(' ').slice(1) : []
    }));
  } catch (err) {
    return [];
  }
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
      return pss[0].pid.toString();
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
