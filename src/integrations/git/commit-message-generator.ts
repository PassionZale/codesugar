import * as vscode from "vscode";

export const GitCommitGenerator = {
  generate,
  abort,
};

let commitGenerationAbortController: AbortController | undefined;

async function delay(wait: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, wait);
  });
}

async function generate(
  context: vscode.ExtensionContext,
  scm?: vscode.SourceControl
) {
  console.log("generate");

  const inputBox = scm?.inputBox;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.SourceControl,
      title: "Generating commit message...",
      cancellable: true,
    },
    () => performCommitGeneration(context, "gitDiff", inputBox)
  );
}

async function performCommitGeneration(
  context: vscode.ExtensionContext,
  gitDiff: string,
  inputBox: any
) {
  try {
    vscode.commands.executeCommand(
      "setContext",
      "codesugar.isGeneratingCommit",
      true
    );

    await delay(2000);

    inputBox.value = gitDiff + "commit message generated via codesugar";
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    vscode.window.showErrorMessage(`生成提交信息失败: ${errorMessage}`);
  } finally {
    vscode.commands.executeCommand(
      "setContext",
      "codesugar.isGeneratingCommit",
      false
    );
  }
}

function abort() {
  console.log("abort");
  vscode.commands.executeCommand(
    "setContext",
    "codesugar.isGeneratingCommit",
    false
  );
}
