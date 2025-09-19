import * as assert from 'assert';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  const exe_path = process.platform === "win32"
    ? path.join(__dirname, "../test-build/Debug/myapp.exe")
    : path.join(__dirname, "../test-build/myapp");
  const ext = process.platform === "win32" ? ".exe" : "";

  function runProcess(executable: string, args: string[] = []): number {
    const proc = spawn(executable, args, { detached: true });
    assert.ok(proc.pid);
    return proc.pid;
  }

  async function matchCmd(pid: number, program: string, args: string[] = []) {
    const results = await vscode.commands.executeCommand('process-matcher.match', { program: program, args: args });
    assert.strictEqual(results, pid ? pid.toString() : null);
  }

  test('FindByName', async () => {
    const pid = runProcess(exe_path);
    try {
      matchCmd(pid, 'myapp');
    } finally {
      process.kill(pid);
    }
  });

  test('FindByArgs', async () => {
    const pid1 = runProcess(exe_path, ['-arg1']);
    const pid2 = runProcess(exe_path, ['-arg2']);
    try {
      await matchCmd(pid2, 'myapp', ['-arg2']);
    } finally {
      process.kill(pid2);
      process.kill(pid1);
    }
  });

  test('FindMulti', async () => {
    const original_showQuickPick = vscode.window.showQuickPick;
    (vscode.window as any).showQuickPick = async (items: any[]) => {
      assert.strictEqual(items.length, 2);
      return items[1];
    };
    const pid1 = runProcess(exe_path, ['-arg1']);
    const pid2 = runProcess(exe_path, ['-arg2']);
    try {
      await matchCmd(pid2, 'myapp');
    } finally {
      process.kill(pid2);
      process.kill(pid1);
      (vscode.window as any).showQuickPick = original_showQuickPick;
    }
  });

  test('FindByNameConflictPath', async () => {
    const common_dir = path.join(__dirname, "xyz_app.test_dir");
    const app1 = path.join(common_dir, `xyz_app${ext}`);
    const app2 = path.join(common_dir, `abc_app${ext}`);
    fs.mkdirSync(common_dir, { recursive: true });
    fs.copyFileSync(exe_path, app1);
    fs.copyFileSync(exe_path, app2);
    const pid1 = runProcess(app1);
    const pid2 = runProcess(app2);
    try {
      await matchCmd(pid1, 'xyz_app');
    } finally {
      process.kill(pid2);
      process.kill(pid1);
      // Wait a bit for processes to fully terminate on Windows
      if (process.platform === "win32") {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      fs.unlinkSync(app1);
      fs.unlinkSync(app2);
      fs.rmdirSync(common_dir);
    }
  });

  test('FindByPartialName', async () => {
    const pid = runProcess(exe_path);
    try {
      await matchCmd(pid, 'mya');
    } finally {
      process.kill(pid);
    }
  });

  test('FindByPartialArgs', async () => {
    const pid1 = runProcess(exe_path);
    const pid2 = runProcess(exe_path, ['--config']);
    try {
      await matchCmd(pid2, 'myapp', ['--conf']);
    } finally {
      process.kill(pid1);
      process.kill(pid2);
    }
  });

  // FIXME
  // test('FindWithSpaces', async () => {
  //   const dir = path.join(__dirname, "test dir with spaces");
  //   const app = path.join(dir, `space app${ext}`);
  //   fs.mkdirSync(dir, { recursive: true });
  //   fs.copyFileSync(exe_path, app);
  //   const pid = runProcess(app, ['--config']);
  //   try {
  //     await matchCmd(pid, 'space app');
  //   } finally {
  //     process.kill(pid);
  //     fs.unlinkSync(app);
  //     fs.rmdirSync(dir);
  //   }
  // });

  // FIXME
  // test('FindByEmptyArgs', async () => {
  //   const pidWithArgs = runProcess(exe_path, ['--some-arg']);
  //   const pidWithoutArgs = runProcess(exe_path);
  //   try {
  //     await matchCmd(pidWithoutArgs, 'myapp', []);
  //   } finally {
  //     process.kill(pidWithArgs);
  //     process.kill(pidWithoutArgs);
  //   }
  // });

  test('NoMatchName', async () => {
    await matchCmd(0, 'nonexistent_app'); // no match
  });

  test('NoMatchArg', async () => {
    const pid = runProcess(exe_path, ['-arg1']);
    try {
      await matchCmd(0, 'myapp', ['-arg2']); // no match
    } finally {
      process.kill(pid);
    }
  });

  test('MissingName', async () => {
    const original_showQuickPick = vscode.window.showQuickPick;
    (vscode.window as any).showQuickPick = async (items: any[]) => {
      assert.ok(items.length > 1);
      return items[1];
    };
    try {
      await vscode.commands.executeCommand('process-matcher.match', {});
    } catch (error) {
      assert.ok(error);
      (vscode.window as any).showQuickPick = original_showQuickPick;
    }
  });

  test('FindByFullPath', async () => {
    const pid = runProcess(exe_path, ['-arg1']);
    try {
      if (process.platform === "win32") {
        await matchCmd(pid, exe_path.replace(/\\/g, '\\\\'));
      } else {
        await matchCmd(pid, exe_path);
      }
    } finally {
      process.kill(pid);
    }
  });
});
