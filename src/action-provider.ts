import * as vscode from 'vscode';
import { UNIT_TEST_CODE } from "./diagnostics";
import { commandHandler } from "./command";

export const COMMAND = 'unit-tests.command';

export class ActionProvider implements vscode.CodeActionProvider{
	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix
	];

	provideCodeActions(_document: vscode.TextDocument, _range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, _token: vscode.CancellationToken): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
		return context.diagnostics
		.filter(diagnostic => diagnostic.code === UNIT_TEST_CODE)
		.map(diagnostic => this.createCommandCodeAction(diagnostic));
	}

	private createCommandCodeAction(diagnostic: vscode.Diagnostic): vscode.CodeAction {
		const action = new vscode.CodeAction('Generate unit test', vscode.CodeActionKind.QuickFix);
		if (diagnostic.source)
		{
			const args: Parameters<typeof commandHandler> = [diagnostic.source, diagnostic.range, diagnostic.message];

			action.command = { command: COMMAND, title: 'teste', arguments: args};
			action.diagnostics = [diagnostic];
			action.isPreferred = true;
		}

		return action;
	}
}