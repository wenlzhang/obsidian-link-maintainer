import { Plugin, DropdownComponent } from 'obsidian';

export interface LinkMatch {
    file: string;
    lineContent: string;
    lineNumber: number;
    linkText: string;
    oldFileName?: string;
}

interface ExtractedInfo {
    blockId: string;
    fileName: string;
}

export enum LinkType {
    NOTE = 'note',
    BLOCK = 'block',
    HEADING = 'heading'
}

export interface LinkMaintainerSettings {
    replaceExistingBlockLinks: boolean;
    enableChangeLogging: boolean;
    logFilePath: string;
    showConfirmationDialog: boolean;
}

export interface LinkChangeLog {
    timestamp: string;
    originalFile: string;
    lineNumber: number;
    originalContent: string;
    newContent: string;
    blockId: string;
    oldFileName: string | null;
    newFileName: string;
}

export interface BatchChangeLog {
    timestamp: string;
    blockId: string;
    newFileName: string;
    description: string;
    changes: LinkChangeLog[];
}

export const DEFAULT_SETTINGS: LinkMaintainerSettings = {
    replaceExistingBlockLinks: false,
    enableChangeLogging: true,
    logFilePath: 'link-maintainer-changes.md',
    showConfirmationDialog: true
};

export function extractBlockInfo(text: string): ExtractedInfo | null {
    // Match complete block reference links [[filename#^blockid]]
    const blockLinkRegex = /\[\[([^\]]+)#\^([^\]\|]+)\]\]/;
    // Match standalone block ID ^blockid
    const blockIdRegex = /\^([^\s\]]+)/;
    
    let match = text.match(blockLinkRegex);
    if (match) {
        return {
            fileName: match[1],
            blockId: match[2]
        };
    }
    
    match = text.match(blockIdRegex);
    if (match) {
        // If only block ID is present, get filename from active file
        const activeFile = app.workspace.getActiveFile();
        if (activeFile) {
            return {
                fileName: activeFile.basename,
                blockId: match[1]
            };
        }
    }
    
    return null;
}


