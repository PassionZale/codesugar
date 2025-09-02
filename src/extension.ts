import * as vscode from "vscode";
import { GitCommitGenerator } from "./integrations/git/commit-message-generator";

export function activate(context: vscode.ExtensionContext) {
	console.log('11111ƒ')
  // Register the generateGitCommitMessage command handler
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "codesugar.generateGitCommitMessage",
      async (scm) => {
        await GitCommitGenerator?.generate?.(context, scm);
      }
    ),
    vscode.commands.registerCommand("codesugar.abortGitCommitMessage", () => {
      GitCommitGenerator?.abort?.();
    })
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
