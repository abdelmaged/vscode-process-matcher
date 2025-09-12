import * as assert from 'assert';
import { spawn } from 'child_process';
import path from 'path';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  const exe_path = process.platform === "win32"
    ? path.join(__dirname, "../test-build/Debug/myapp.exe")
    : path.join(__dirname, "../test-build/myapp");

  test('FindByName', async () => {
    const proc = spawn(exe_path, [], { detached: true });
    assert.ok(proc.pid);
    try {
      const results = await vscode.commands.executeCommand('process-matcher.match', { program: 'myapp', args: [] });
      assert.strictEqual(results, proc.pid.toString());
    } finally {
      process.kill(proc.pid);
    }
  });

  test('FindByArgs', async () => {
    const proc1 = spawn(exe_path, ['-arg1'], { detached: true });
    const proc2 = spawn(exe_path, ['-arg2'], { detached: true });
    assert.ok(proc1.pid);
    assert.ok(proc2.pid);
    try {
      const results = await vscode.commands.executeCommand('process-matcher.match', { program: 'myapp', args: ['-arg2'] });
      assert.strictEqual(results, proc2.pid.toString());
    } finally {
      process.kill(proc2.pid);
      process.kill(proc1.pid);
    }
  });

  test('FindMulti', async () => {
    const original_showQuickPick = vscode.window.showQuickPick;
    (vscode.window as any).showQuickPick = async (items: any[]) => {
      return items[1];
    };
    const proc1 = spawn(exe_path, ['-arg1'], { detached: true });
    const proc2 = spawn(exe_path, ['-arg2'], { detached: true });
    assert.ok(proc1.pid);
    assert.ok(proc2.pid);
    try {
      const results = await vscode.commands.executeCommand('process-matcher.match', { program: 'myapp', args: [] });
      assert.strictEqual(results, proc2.pid.toString());
    } finally {
      process.kill(proc2.pid);
      process.kill(proc1.pid);
      (vscode.window as any).showQuickPick = original_showQuickPick;
    }
  });
});
