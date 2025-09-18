import * as vscode from "vscode";
import { ConfigProvider } from "../../core/ConfigProvider";
import { GitExtension, Repository } from "../../typings/git";
import OpenAI from "openai";

export const GitCommitGenerator = {
  generate,
  abort,
};

export enum GitStatus {
  INDEX_MODIFIED,
  INDEX_ADDED,
  INDEX_DELETED,
  INDEX_RENAMED,
  INDEX_COPIED,

  MODIFIED,
  DELETED,
  UNTRACKED,
  IGNORED,
  INTENT_TO_ADD,
  INTENT_TO_RENAME,
  TYPE_CHANGED,

  ADDED_BY_US,
  ADDED_BY_THEM,
  DELETED_BY_US,
  DELETED_BY_THEM,
  BOTH_ADDED,
  BOTH_DELETED,
  BOTH_MODIFIED,
}

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

    let diffCached: string = "";
    let untrackedDiff: string = "";

    diffCached = await repository.diff(true);

    if (!diffCached) {
      untrackedDiff = await getUntrackedFilesDiff(repository);
    }

    const diff = diffCached || untrackedDiff;

    return diff.trim();
  } catch (error) {
    console.error(error);

    return "";
  }
}

// 获取未跟踪文件的内容（模拟diff格式）
async function getUntrackedFilesDiff(repository: Repository): Promise<string> {
  let untrackedDiff = "";

  // 获取工作目录中的所有变更
  const workingTreeChanges = repository.state.workingTreeChanges;

  // 过滤出未跟踪的文件
  const untrackedFiles = workingTreeChanges.filter(
    (change) => change.status === GitStatus.UNTRACKED
  );

  for (const change of untrackedFiles) {
    try {
      // 读取文件内容
      const document = await vscode.workspace.openTextDocument(change.uri);
      const content = document.getText();

      // 生成类似 git diff 的格式
      untrackedDiff += `diff --git a/${getRelativePath(
        change.uri
      )} b/${getRelativePath(change.uri)}\n`;
      untrackedDiff += `new file mode 100644\n`;
      untrackedDiff += `index 0000000..${generateFakeHash(content)}\n`;
      untrackedDiff += `--- /dev/null\n`;
      untrackedDiff += `+++ b/${getRelativePath(change.uri)}\n`;

      // 添加文件内容（每行前加 + 号）
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        untrackedDiff += `+${line}\n`;
      });

      untrackedDiff += "\n";
    } catch (error) {
      console.error(
        `Error reading untracked file ${change.uri.fsPath}:`,
        error
      );

      // 如果无法读取文件内容，至少显示文件信息
      untrackedDiff += `diff --git a/${getRelativePath(
        change.uri
      )} b/${getRelativePath(change.uri)}\n`;
      untrackedDiff += `new file mode 100644\n`;
      untrackedDiff += `--- /dev/null\n`;
      untrackedDiff += `+++ b/${getRelativePath(change.uri)}\n`;
      untrackedDiff += `@@ -0,0 +1 @@\n`;
      untrackedDiff += `+[Binary file or read error]\n\n`;
    }
  }

  return untrackedDiff;
}

// 获取相对于仓库根目录的路径
function getRelativePath(uri: vscode.Uri): string {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  if (workspaceFolder) {
    return vscode.workspace.asRelativePath(uri);
  }
  return uri.fsPath;
}

// 生成简单的哈希值（模拟git对象哈希）
function generateFakeHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 转换为32位整数
  }
  return Math.abs(hash).toString(16).padStart(7, "0");
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
      "You are a helpful assistant that generates informative git commit messages based on git diffs output. Skip preamble and remove all backticks surrounding the commit message.";

    const truncatedDiff =
      gitDiff.length > 5000
        ? gitDiff.substring(0, 5000) + "\n\n[Diff truncated due to size]"
        : gitDiff;

    const userPrompt = `Based on the following git diff, generate a concise and descriptive commit message:
${truncatedDiff}
The commit message should:
1. use **${config.language}** language
2. Has a short title (50-72 characters)
3. The commit message should adhere to the conventional commit format
4. Describe what was changed and why
5. Be clear and informative
`;

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
