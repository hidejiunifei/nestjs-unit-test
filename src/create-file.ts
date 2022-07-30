import * as fs from 'fs';
import * as vscode from 'vscode';

export function CreateFile(editor: vscode.TextEditor, range: vscode.Range, parent: string, symbolKindString: string){
	let filePath = editor.document.uri.fsPath.replace("src", "test");
	let filename = filePath.substring(filePath.lastIndexOf("\\")+1, filePath.lastIndexOf("."));
	filePath = filePath.substring(0, filePath.lastIndexOf(".")) + ".spec.ts";
	const directory = filePath.substring(0, filePath.lastIndexOf("\\"));
	const skeleton = fs.readFileSync("C:\\Users\\HH00794011\\unit-test\\src\\skeleton.txt").toString();

	if (!fs.existsSync(directory))
	{
		fs.mkdirSync(directory, { recursive: true});
	}

	const unitTest = generateUnitTest(editor, range, parent);
	const imports = generateImports(editor, symbolKindString, range, parent);
	const lets = generateLets(parent);
	const instances = generateInstances(parent);

	if (fs.existsSync(filePath)){
		fs.appendFileSync(filePath, unitTest);
	}
	else{
		fs.writeFileSync(filePath, `${skeleton
			.replace("[filename]", filename)
			.replace("[content]", unitTest)
			.replace("[imports]", imports)
			.replace("[lets]", lets)
			.replace("[instances]", instances)
		}`);
	}
}

function generateUnitTest(editor: vscode.TextEditor, range: vscode.Range, parent: string) : string{
	const prefix = parent ? `mock${parent}.` : "";
	return `describe("${editor.document.getText(range)}", ()=> {${prefix}${editor.document.getText(range)}();});`;
}

function generateLets(parent: string): string{
	if (parent)
		{return `let mock${parent}: ${parent}`;}
	else
		{return "";}
}

function generateInstances(parent: string): string{
	if (parent)
		{return `mock${parent} = testingModule.get(${parent})`;}
	else
		{return "";}
}

function generateImports(editor: vscode.TextEditor, symbolKindString: string, range: vscode.Range, parent: string): string{
	let imports : string = "";
	let importPath = editor.document.uri.path;
	if (importPath)
	{
		const numberOfGoBacks = importPath.substring(importPath.indexOf("/src/")+1).match(/\//g)?.length;
		if (numberOfGoBacks)
			{importPath = "../".repeat(numberOfGoBacks) + importPath.substring(importPath.indexOf("/src/")+1, importPath.indexOf("."));}
	}

	switch (symbolKindString) {
		case "Function":
			imports = `import { ${editor.document.getText(range)} } from "${importPath}";`;
			break;
		case "Method":
			imports = `import { ${parent} } from "${importPath}";`;
			break;
	}
	return imports;
}