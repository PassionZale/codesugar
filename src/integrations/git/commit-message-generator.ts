import * as vscode from "vscode";
import { ConfigProvider } from "../../core/ConfigProvider";
import { GitExtension } from "../../typings/git";
import OpenAI from "openai";

export const GitCommitGenerator = {
  generate,
  abort,
};

let commitGenerationAbortController: AbortController | undefined;

async function generate(
  context: vscode.ExtensionContext,
  scm?: vscode.SourceControl
) {
  if (!context) {
    vscode.window.showErrorMessage("No workspace folder open");

    return;
  }

  const inputBox = scm?.inputBox;

  if (!inputBox) {
    vscode.window.showErrorMessage(
      "Git extension not found or no repositories available"
    );
    return;
  }

  // validate Config
  const config = ConfigProvider.getConfig();

  if (!config.apiKey) {
    const result = await vscode.window.showWarningMessage(
      "apiKey is not setup. Open Setting and setup apiKey first.",
      "Open Setting"
    );

    if (result === "Open Setting") {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "codesugar"
      );
    }
    return;
  }

  const gitDiff = await getWorkingState();

  if (!gitDiff) {
    vscode.window.showErrorMessage("No changes in working directory");

    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.SourceControl,
      title: "Generating commit message...",
      cancellable: true,
    },
    () => performCommitGeneration(gitDiff, inputBox)
  );
}

async function getWorkingState() {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const GitExtensionApi = vscode.extensions
      .getExtension<GitExtension>("vscode.git")
      ?.exports.getAPI(1);

    if (!workspaceFolder) {
      throw new Error("Not a git repository");
    }

    const repository = GitExtensionApi?.getRepository(workspaceFolder.uri);

    if (!repository?.diff) {
      throw new Error("Git is not installed");
    }

    const diff = await repository.diff();

    return diff.trim();
  } catch (error) {
    console.error(error);

    return "";
  }
}

function extractCommitMessage(str: string): string {
  // Remove any markdown formatting or extra text
  return str
    .trim()
    .replace(/^```[^\n]*\n?|```$/g, "")
    .trim();
}

async function performCommitGeneration(gitDiff: string, inputBox: any) {
  try {
    vscode.commands.executeCommand(
      "setContext",
      "codesugar.isGeneratingCommit",
      true
    );

    commitGenerationAbortController = new AbortController();

    const config = ConfigProvider.getConfig();

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });

    const systemPrompt =
      "You are a helpful assistant that generates concise and descriptive git commit messages based on git diffs.";

    const truncatedDiff =
      gitDiff.length > 5000
        ? gitDiff.substring(0, 5000) + "\n\n[Diff truncated due to size]"
        : gitDiff;

    const userPrompt = `Based on the following git diff, generate a concise and descriptive commit message:
${truncatedDiff}
The commit message should:
1. Start with a short summary (50-72 characters)
2. Use the imperative mood (e.g., "Add feature" not "Added feature")
3. Describe what was changed and why
4. Be clear and descriptive
5. use ${config.language}
Commit message:`;

    const stream = await client.chat.completions.create({
      model: config.modelName,
      stream: true,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    let response = "";

    for await (const chunk of stream) {
      commitGenerationAbortController.signal.throwIfAborted();

      if (chunk.choices[0].delta.content) {
        response += chunk.choices[0].delta.content;
        inputBox.value = extractCommitMessage(response);
      }
    }

    if (!inputBox.value) {
      throw new Error("empty API response");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    vscode.window.showErrorMessage(
      `Faield generate commit message: ${errorMessage}`
    );
  } finally {
    vscode.commands.executeCommand(
      "setContext",
      "codesugar.isGeneratingCommit",
      false
    );
  }
}

function abort() {
  commitGenerationAbortController?.abort();

  vscode.commands.executeCommand(
    "setContext",
    "codesugar.isGeneratingCommit",
    false
  );
}
