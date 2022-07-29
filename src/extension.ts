// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { subscribeToDocumentChanges } from "./diagnostics"
import { ActionProvider, COMMAND } from "./action-provider"
import { commandHandler } from "./command"

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "unit-test" is now active!');

	const diagnosticCollection = vscode.languages.createDiagnosticCollection("unit test");
	subscribeToDocumentChanges(context, diagnosticCollection);
	context.subscriptions.push(diagnosticCollection);
	
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider({ language: "typescript" } as vscode.DocumentFilter, new ActionProvider(), {
			providedCodeActionKinds: ActionProvider.providedCodeActionKinds
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(COMMAND, commandHandler)
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}
