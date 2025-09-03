# Codesugar

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

自动生成 Git 提交消息的 VS Code 扩展。

Codesugar 是一个智能的 VS Code 扩展，利用 AI 技术帮助开发者自动生成高质量的 Git 提交信息。通过分析代码变更内容，Codesugar 能够生成清晰、准确且符合规范的提交信息，提升开发效率和代码管理质量。

## 功能特性

- **AI 驱动**: 利用 OpenAI API 自动生成高质量的 Git 提交信息
- **多语言支持**: 支持中文和英文提交信息生成
- **无缝集成**: 与 VS Code SCM 深度集成，使用便捷
- **可配置性**: 支持自定义 API 密钥、基础 URL 和模型名称
- **实时预览**: 在生成过程中实时预览提交信息
- **可中止操作**: 支持在生成过程中随时中止操作

## 安装

1. 在 VS Code 扩展市场中搜索 "Codesugar"
2. 点击安装按钮
3. 重新加载 VS Code（如果需要）

或者，您可以从 GitHub 下载最新版本并手动安装：

1. 下载 `.vsix` 文件
2. 在 VS Code 中，使用 `Extensions: Install from VSIX` 命令安装

## 使用方法

1. 确保您的工作区是一个 Git 仓库且有未提交的更改
2. 打开 VS Code 的源代码管理视图
3. 点击 "Generate Commit Message with Codesugar" 按钮（或使用命令面板搜索该命令）
4. 等待 AI 生成提交信息（会自动填充到提交信息输入框中）
5. 根据需要微调生成的提交信息
6. 提交您的更改

您也可以通过命令面板使用以下命令：
- `Codesugar: Generate Commit Message with Codesugar` - 生成提交信息
- `Codesugar: Generate Commit Message with Codesugar - Stop` - 中止生成过程

## 配置

Codesugar 提供了以下配置选项，您可以在 VS Code 设置中进行调整：

- `codesugar.apiKey` - API 密钥（必需）
- `codesugar.baseUrl` - 模型服务提供商的基础 URL（可选，默认为 OpenAI）
- `codesugar.modelName` - 模型名称（可选，默认为 o3-mini）
- `codesugar.language` - 生成提交信息的语言（可选，默认为 zh-CN）

**安全提示**: API 密钥将被存储在 VS Code 设置中，请确保您信任此环境。

## 开发

如果您想参与开发或自定义扩展，请按照以下步骤操作：

1. 克隆仓库
2. 安装依赖：`npm install`
3. 在 VS Code 中打开项目
4. 按 `F5` 启动调试实例

### 构建

```bash
npm run compile
```

### 打包

```bash
npm run package
```

## 许可证

本项目采用 MIT 许可证。详情请见 [LICENSE](LICENSE) 文件。
