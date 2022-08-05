import * as vscode from 'vscode';

export const UNIT_TEST_CODE = "unit_test";

export function refreshDiagnostics(doc: vscode.TextDocument, diagnostics: vscode.DiagnosticCollection): void{
	vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
		'vscode.executeDocumentSymbolProvider',
		doc.uri,
		).then((symbols) => {
			iterateOnSymbols(symbols, doc).then((new_diagnostics)=>{
				diagnostics.set(doc.uri, new_diagnostics);
			});
		});
}

async function iterateOnSymbols(symbols: vscode.DocumentSymbol[], doc: vscode.TextDocument): Promise<vscode.Diagnostic[]>{
	const new_diagnostics: vscode.Diagnostic[] = [];
	for (const symbol of symbols) {
		switch (symbol.kind) {
			case vscode.SymbolKind.Class:
				const diagnostics = await generateClassDiagnostic(symbol, doc);
				new_diagnostics.push(...diagnostics);
				break;
			case vscode.SymbolKind.Function:
				const diagnostic = await generateFunctionDiagnostic(symbol, doc);
				if (diagnostic instanceof vscode.Diagnostic)
					{new_diagnostics.push(diagnostic);}
				break;
		}
	}

	return new_diagnostics;
}

async function generateClassDiagnostic(symbol: vscode.DocumentSymbol, doc: vscode.TextDocument): Promise<vscode.Diagnostic[]>{
	const diagnostics: vscode.Diagnostic[] = [];
	for(const child of symbol.children){
		if (child.kind == vscode.SymbolKind.Method || child.kind == vscode.SymbolKind.Constructor ){
			const diagnostic = await vscode.commands.executeCommand<vscode.Location[]>(
				'vscode.executeReferenceProvider',
				doc.uri,
				child.selectionRange.start
				).then((references) =>{
					return createDiagnostic(references, child, symbol);
				});
			if (diagnostic instanceof vscode.Diagnostic)
				{diagnostics.push(diagnostic);}
		}
	}

	return diagnostics;
}

async function generateFunctionDiagnostic(symbol: vscode.DocumentSymbol, doc: vscode.TextDocument): Promise<vscode.Diagnostic | void>{
	return vscode.commands.executeCommand<vscode.Location[]>(
		'vscode.executeReferenceProvider',
		doc.uri,
		symbol.selectionRange.start
		).then((references) =>{
			return createDiagnostic(references, symbol, 
			new vscode.DocumentSymbol("name", "detail", vscode.SymbolKind.Null, 
			new vscode.Range(new vscode.Position(1,1),new vscode.Position(1,1)),
			new vscode.Range(new vscode.Position(1,1),new vscode.Position(1,1))));
		});
}

function createDiagnostic(references: vscode.Location[], child: vscode.DocumentSymbol,
	parent: vscode.DocumentSymbol): vscode.Diagnostic | void{
	let count = 0;
	for (const reference of references) {
		if (reference.uri.path.indexOf(".spec.ts")>=0){
			count++;
			break;
		}
	}
	if (count == 0){
		let startPosition, endPosition;
		if (child.kind == vscode.SymbolKind.Constructor){
			startPosition = new vscode.Position(child.selectionRange.start.line, child.selectionRange.start.character);
			endPosition = new vscode.Position(child.selectionRange.start.line, 12);
		}
		else{
			startPosition = new vscode.Position(child.selectionRange.end.line, child.selectionRange.start.character);
			endPosition = new vscode.Position(child.selectionRange.end.line, child.selectionRange.end.character);
		}

		let diagnostic = new vscode.Diagnostic(new vscode.Range(startPosition, endPosition),
			"no unit test found", vscode.DiagnosticSeverity.Warning);
		diagnostic.code = UNIT_TEST_CODE;
		diagnostic.source = vscode.SymbolKind[child.kind];
		if (parent.kind != vscode.SymbolKind.Null)
			{diagnostic.message = parent.name;}

		return diagnostic;
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