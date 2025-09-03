import * as vscode from "vscode";

export interface Config {
  apiKey: string;
  baseUrl?: string;
  modelName: string;
  language: "zh-CN" | "en-US";
}

export class ConfigProvider {
  private static readonly CONFIG_SECTION = "codesugar";

  static getConfig(): Config {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);

    return {
      apiKey: config.get<string>("apiKey", ""),
      baseUrl: config.get<string>("baseUrl", "https://api.openai.com/v1"),
      modelName: config.get<string>("modelName", "o3-mini"),
      language: config.get<Config["language"]>("language", "zh-CN"),
    };
  }
}
