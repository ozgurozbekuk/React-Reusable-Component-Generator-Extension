import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function ensureCNUtilExists(rootPath: string) {
  const utilsFolderPath = path.join(rootPath, 'src', 'lib');
  const utilsFilePath = path.join(utilsFolderPath, 'utils.js');

  if (!fs.existsSync(utilsFolderPath)) {
    fs.mkdirSync(utilsFolderPath, { recursive: true });
  }

  if (!fs.existsSync(utilsFilePath)) {
    const cnFunctionCode = `export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
`;
    fs.writeFileSync(utilsFilePath, cnFunctionCode);
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "react-component-creator" is now active!');

  let disposable = vscode.commands.registerCommand('extension.createComponentFile', async () => {
    // Ask for component name
    const fileName = await vscode.window.showInputBox({
      prompt: 'Enter component name (e.g. MyButton)',
      value: 'MyComponent'
    });
    if (!fileName) {
      vscode.window.showErrorMessage('Component name not provided.');
      return;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace opened.');
      return;
    }
    const rootPath = workspaceFolders[0].uri.fsPath;
    const componentFolderPath = path.join(rootPath, 'src', 'reuseComponents');

    // Create folder if not exists
    if (!fs.existsSync(componentFolderPath)) {
      fs.mkdirSync(componentFolderPath, { recursive: true });
    }

    // Ensure cn util exists
    await ensureCNUtilExists(rootPath);

    // Prepare component file path
    const componentFilePath = path.join(componentFolderPath, `${fileName}.jsx`);

    // Get active text editor and selection
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor.');
      return;
    }
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText) {
      vscode.window.showErrorMessage('No code selected.');
      return;
    }

    // Prepare React component code with forwardRef and cn usage
    const componentCode = `import React from 'react';
import { cn } from '../lib/utils';

const ${fileName} = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <>
${selectedText.split('\n').map(line => '      ' + line).join('\n')}
    </>
  );
});

${fileName}.displayName = '${fileName}';

export default ${fileName};
`;

    // Check if file exists
    if (fs.existsSync(componentFilePath)) {
      vscode.window.showWarningMessage('Component file already exists: ' + componentFilePath);
      return;
    }

    // Write the component file
    try {
      fs.writeFileSync(componentFilePath, componentCode);
      vscode.window.showInformationMessage(`Component created at ${componentFilePath}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        vscode.window.showErrorMessage('Error creating file: ' + error.message);
      } else {
        vscode.window.showErrorMessage('Unknown error.');
      }
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
