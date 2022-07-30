import * as vscode from 'vscode';
import { CreateFile } from "./create-file";

export const commandHandler = async(symbolKindString: string, range: vscode.Range, parent: string) =>{
	const editor = vscode.window.activeTextEditor;

	if(!editor)
		{return;}
	await CreateFile(editor, range, parent, symbolKindString);	
};