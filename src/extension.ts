import * as vscode from "vscode";
import { GitCommitGenerator } from "./integrations/git/commit-message-generator";

export function activate(context: vscode.ExtensionContext) {
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

export function deactivate() {}
