import * as fs from 'fs';
import * as vscode from 'vscode';
import { skeleton }  from './skeleton';

export async function CreateFile(editor: vscode.TextEditor, range: vscode.Range, parent: string, symbolKindString: string){
	let filePath = editor.document.uri.fsPath.replace("src", "test");
	let filename = filePath.substring(filePath.lastIndexOf("\\")+1, filePath.lastIndexOf("."));
	filePath = filePath.substring(0, filePath.lastIndexOf(".")) + ".spec.ts";
	const directory = filePath.substring(0, filePath.lastIndexOf("\\"));

	if (!fs.existsSync(directory)){
		fs.mkdirSync(directory, { recursive: true});
	}

	const unitTest = await generateUnitTest(editor.document, range, parent, symbolKindString);
	const imports = generateImports(editor.document, symbolKindString, range, parent);
	const lets = generateLets(parent, symbolKindString);
	const instances = generateInstances(parent, symbolKindString);

	if (fs.existsSync(filePath)){
		fs.appendFileSync(filePath, unitTest);
	}
	else{
		fs.writeFileSync(filePath, skeleton
			.replace("[filename]", filename)
			.replace("[content]", unitTest)
			.replace("[imports]", imports)
			.replace("[lets]", lets)
			.replace("[instances]", instances));
	}
}

async function iterateOnMethodDefinitionLines(doc: vscode.TextDocument, methodDefinition: vscode.LocationLink)
: Promise<string>{
	let unitTest: string = "";
	for (let index = methodDefinition.targetRange.start.line+1;
		index < methodDefinition.targetRange.end.line;
		index++) {

		const lineText = doc.getText(new vscode.Range(
			new vscode.Position(index, 0),
			new vscode.Position(index, Number.MAX_VALUE)
		)).replace(/\t/g, "    ");

		for (const match of lineText.matchAll(/[\w-]*\.([^\s.]+)\(/g)){
			if (match.length > 1){
				const variableDefinition = await getVariableDefinition(doc, index, lineText.indexOf(match[0]));
				unitTest = unitTest.concat(processVariableDefinition(variableDefinition, doc, match[1]));
			}
		}
	}

	return unitTest;
}

function processVariableDefinition(variableDefinition: vscode.LocationLink[], doc: vscode.TextDocument,
	mockFunctionName: string): string{
	let unitTest: string = "";
	if(variableDefinition && variableDefinition.length > 0){
		if (variableDefinition[0].targetUri.path == doc.uri.path){
			const variableText = doc.getText(variableDefinition[0].targetRange);
			for (const matchDef of variableText.matchAll(/[\w-]+:\s*([^,;=]+)[=,;]*/g)){
				if (matchDef.length > 1){
					unitTest = unitTest.concat(`\n\t\tconst mock${mockFunctionName} = sinon.stub(mock${matchDef[1]}, "${mockFunctionName}");`);
					unitTest = unitTest.concat(`\n\t\tsinon.assert.calledOnce(mock${mockFunctionName});`);
					unitTest = unitTest.concat(`\n\t\tmock${mockFunctionName}.restore();`);
				}	
			}
		}
	}

	return unitTest;
}

async function getVariableDefinition(doc: vscode.TextDocument, index: number, characterIndex: number)
: Promise<vscode.LocationLink[]>{
	return vscode.commands.executeCommand<vscode.LocationLink[]>(
		'vscode.executeDefinitionProvider',
		doc.uri,
		new vscode.Position(index, characterIndex)
		);
}

async function generateUnitTest(doc: vscode.TextDocument, range: vscode.Range, parent: string, symbolKindString: string) : Promise<string> {

	const prefix = parent ? `mock${parent}.` : "";
	const method = symbolKindString === "Constructor" ? `new ${parent}()`:
	`${prefix}${ doc.getText(range)}()`;
	let unitTest: string = `describe("${doc.getText(range)}", ()=> {\n\tit("pending description", ()=> {\n\t\t${method};`;

	if (parent){
		await vscode.commands.executeCommand<vscode.LocationLink[]>(
			'vscode.executeDefinitionProvider',
			doc.uri,
			range.start
			).then(async (definitions) => {
				if (definitions && definitions.length > 0){
					unitTest = unitTest.concat(await iterateOnMethodDefinitionLines(doc, definitions[0]));
				}	
			});
	}
	unitTest = unitTest.concat("\n\t\t});\n\t});");

	return unitTest;
}

function generateLets(parent: string, symbolKindString: string): string{
	if (parent && symbolKindString != "Constructor")
		{return `let mock${parent}: ${parent}`;}
	else
		{return "";}
}

function generateInstances(parent: string, symbolKindString: string): string{
	if (parent && symbolKindString != "Constructor")
		{return `mock${parent} = testingModule.get(${parent});`;}
	else
		{return "";}
}

function generateImports(doc: vscode.TextDocument, symbolKindString: string, range: vscode.Range, parent: string): string{
	let imports : string = "";
	let importPath = doc.uri.path;
	if (importPath){
		const numberOfGoBacks = importPath.substring(importPath.indexOf("/src/")+1).match(/\//g)?.length;
		if (numberOfGoBacks)
			{importPath = "../".repeat(numberOfGoBacks) + importPath.substring(importPath.indexOf("/src/")+1, importPath.indexOf(".ts"));}
	}

	switch (symbolKindString) {
		case "Function":
			imports = `import { ${doc.getText(range)} } from "${importPath}";`;
			break;
		case "Constructor":
		case "Method":
			imports = `import { ${parent} } from "${importPath}";`;
			break;
	}
	return imports;
}