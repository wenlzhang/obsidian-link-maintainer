import { App } from 'obsidian';
import { SearchLinks } from './searchLinks';
import { BlockReferenceManager } from './BlockReferenceManager';
import { LinkReplacer } from './LinkReplacer';

export interface LinkMatch {
    file: string;
    lineContent: string;
    lineNumber: number;
    linkText: string;
    oldFileName: string | null;
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
    originalFile: string;
    lineNumber: number;
    originalContent: string;
    newContent: string;
    blockId: string | null;
    oldFileName: string | null;
    newFileName: string | null;
    timestamp?: string;
}

export interface BatchChangeLog {
    timestamp: string;
    blockId: string;
    newFileName: string;
    description: string;
    changes: ChangeEntry[];
}

export interface ILinkMaintainer {
    app: App;
    settings: LinkMaintainerSettings;
    currentBatchLog: BatchChangeLog | null;
    searchLinksHelper: SearchLinks;
    blockReferenceManager: BlockReferenceManager;
    linkReplacer: LinkReplacer;
    
    showConfirmationDialog(matches: LinkMatch[], newFileName: string, reference: string | null, linkType: LinkType): Promise<void>;
    logChange(change: ChangeEntry): Promise<void>;
    initBatchLog(blockId: string, newFileName: string): void;
    writeBatchToLog(): Promise<void>;
    clearBatchLog(): void;
}

export class BatchChangeLogImpl implements BatchChangeLog {
    timestamp: string = '';
    blockId: string = '';
    newFileName: string = '';
    description: string = '';
    changes: ChangeEntry[] = [];

    constructor(blockId: string = '', newFileName: string = '') {
        this.blockId = blockId;
        this.newFileName = newFileName;
        this.timestamp = new Date().toISOString();
        this.description = `Block reference update: ^${blockId} → ${newFileName}`;
    }
}
