import * as vscode from 'vscode';

export const UNIT_TEST_CODE = "unit_test";

export function refreshDiagnostics(doc: vscode.TextDocument, diagnostics: vscode.DiagnosticCollection): void{
	const new_diagnostics: vscode.Diagnostic[] = [];

	vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
		'vscode.executeDocumentSymbolProvider',
		doc.uri,
		).then((symbols) => {
			iterateOnSymbols(symbols, doc, new_diagnostics, diagnostics);
		});
}

function iterateOnSymbols(symbols: vscode.DocumentSymbol[], doc: vscode.TextDocument, 
	new_diagnostics: vscode.Diagnostic[], diagnostics: vscode.DiagnosticCollection){
	for (const symbol of symbols) {
		switch (symbol.kind) {
			case vscode.SymbolKind.Class:
				iterateOnChildren(symbol, doc, new_diagnostics, diagnostics)
				break;
			case vscode.SymbolKind.Function:
				generateFunctionDiagnostic(symbol, doc, new_diagnostics, diagnostics);
				break;
		}
	}
}

function iterateOnChildren(symbol: vscode.DocumentSymbol, doc: vscode.TextDocument, 
	new_diagnostics: vscode.Diagnostic[], diagnostics: vscode.DiagnosticCollection){
	for(const child of symbol.children){
		if (child.kind == vscode.SymbolKind.Method){
			vscode.commands.executeCommand<vscode.Location[]>(
				'vscode.executeReferenceProvider',
				doc.uri,
				child.selectionRange.start
				).then((references) =>{
					if (references.length > 1){
						createDiagnostic(references, new_diagnostics, diagnostics, doc, child, symbol);
					}
				});
		}
	}
}

function generateFunctionDiagnostic(symbol: vscode.DocumentSymbol, doc: vscode.TextDocument, 
	new_diagnostics: vscode.Diagnostic[], diagnostics: vscode.DiagnosticCollection){
	vscode.commands.executeCommand<vscode.Location[]>(
		'vscode.executeReferenceProvider',
		doc.uri,
		symbol.selectionRange.start
		).then((references) =>{
			if (references.length > 1){
				createDiagnostic(references, new_diagnostics, diagnostics, doc, symbol, 
				new vscode.DocumentSymbol("name", "detail", vscode.SymbolKind.Null, 
				new vscode.Range(new vscode.Position(1,1),new vscode.Position(1,1)),
				new vscode.Range(new vscode.Position(1,1),new vscode.Position(1,1))));
			}
		});
}

function createDiagnostic(references: vscode.Location[], new_diagnostics: vscode.Diagnostic[],
	diagnostics: vscode.DiagnosticCollection, doc: vscode.TextDocument, child: vscode.DocumentSymbol,
	parent: vscode.DocumentSymbol): void{
	let count = 0;
	for (const reference of references) {
		if (reference.uri.path.indexOf(".spec.ts")>=0){
			count++;
			break;
		}
	}
	if (count == 0){
		let diagnostic = new vscode.Diagnostic(new vscode.Range(
			new vscode.Position(child.selectionRange.end.line, child.selectionRange.start.character), 
			new vscode.Position(child.selectionRange.end.line, child.selectionRange.end.character)),
			"no unit test found", vscode.DiagnosticSeverity.Warning);
		diagnostic.code = UNIT_TEST_CODE;
		diagnostic.source = vscode.SymbolKind[child.kind];
		if (parent.kind != vscode.SymbolKind.Null)
			{diagnostic.message = parent.name;}
		new_diagnostics.push(diagnostic);
		diagnostics.set(doc.uri, new_diagnostics);
	}
}

export function subscribeToDocumentChanges(context: vscode.ExtensionContext, diagnostics: vscode.DiagnosticCollection): void{
	if (vscode.window.activeTextEditor){
		refreshDiagnostics(vscode.window.activeTextEditor.document, diagnostics);
	}

	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor){
				refreshDiagnostics(editor.document, diagnostics);
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document, diagnostics))
	);

	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument(doc => diagnostics.delete(doc.uri))
	);
}