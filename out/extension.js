"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureCNUtilExists = ensureCNUtilExists;
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
async function ensureCNUtilExists(rootPath) {
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
function activate(context) {
    console.log('Extension "react-component-creator" is now active!');
    let disposable = vscode.commands.registerCommand('extension.createComponentFile', async () => {
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
        if (!fs.existsSync(componentFolderPath)) {
            fs.mkdirSync(componentFolderPath, { recursive: true });
        }
        await ensureCNUtilExists(rootPath);
        const componentFilePath = path.join(componentFolderPath, `${fileName}.jsx`);
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor.');
            return;
        }
        const selection = editor.selection;
        let selectedText = editor.document.getText(selection);
        if (!selectedText) {
            vscode.window.showErrorMessage('No code selected.');
            return;
        }
        // Replace class or className attributes to merge with incoming className prop
        selectedText = selectedText.replace(/<(\w+)([^>]*)>/g, (fullMatch, tagName, attrs) => {
            // Check if className attribute exists
            const classNameMatch = attrs.match(/className=(["'{])([^"'}]+)\1/);
            if (classNameMatch) {
                const existingClasses = classNameMatch[2];
                // Replace existing className with cn(...) including passed className prop
                const newAttrs = attrs.replace(classNameMatch[0], `className={cn("${existingClasses}", className)}`);
                return `<${tagName}${newAttrs}>`;
            }
            // Check if class attribute exists
            const classMatch = attrs.match(/class=(["'])([^"']+)\1/);
            if (classMatch) {
                const existingClasses = classMatch[2];
                // Remove class attribute and add className with cn(...)
                const newAttrs = attrs.replace(classMatch[0], '') + ` className={cn("${existingClasses}", className)}`;
                return `<${tagName}${newAttrs}>`;
            }
            // If no class or className attribute, add className={className}
            return `<${tagName}${attrs} className={className}>`;
        });
        // Replace static inner text with {children} for all first-level elements
        selectedText = selectedText.replace(/<(\w+)([^>]*)>([^<]+)<\/\1>/g, (match, tagName, attrs, innerText) => {
            // If innerText is not empty and does not contain JSX tags, replace with {children}
            if (innerText.trim() && !innerText.includes('<')) {
                return `<${tagName}${attrs}>{children}</${tagName}>`;
            }
            return match;
        });
        const componentCode = `import React from 'react';
import { cn } from '../lib/utils';

const ${fileName} = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    ${selectedText}
  );
});

${fileName}.displayName = '${fileName}';

export default ${fileName};
`;
        if (fs.existsSync(componentFilePath)) {
            vscode.window.showWarningMessage('Component file already exists: ' + componentFilePath);
            return;
        }
        try {
            fs.writeFileSync(componentFilePath, componentCode);
            vscode.window.showInformationMessage(`Component created at ${componentFilePath}`);
        }
        catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage('Error creating file: ' + error.message);
            }
            else {
                vscode.window.showErrorMessage('Unknown error.');
            }
        }
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map