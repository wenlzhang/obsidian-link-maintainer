export interface LinkMatch {
    file: string;
    lineContent: string;
    lineNumber: number;
    linkText: string;
    oldFileName: string | null;
    isCanvasNode?: boolean;
    nodeId?: string;
}

export interface ExtractedInfo {
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

export interface ChangeEntry {
    originalContent: string;
    newContent: string;
    lineNumber: number;
    originalFile: string;
}

export class BatchChangeLog {
    timestamp: string;
    blockId: string;
    newFileName: string;
    description: string;
    changes: ChangeEntry[];
}
