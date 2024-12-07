import { App, Plugin, Modal, TextComponent, Notice, DropdownComponent, TFile, Editor, MarkdownView } from 'obsidian';
import { getCleanBlockRef, extractBlockInfo } from './utils';
import { LinkMaintainerSettingTab } from 'LinkMaintainerSettingTab';
import { DEFAULT_SETTINGS } from 'DEFAULT_SETTINGS';
import { SearchModal } from './SearchModal';
import { ResultsModal } from './ResultsModal';
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

export class LinkChangeLog {
    timestamp: string;
    originalFile: string;
    lineNumber: number;
    originalContent: string;
    newContent: string;
    blockId: string;
    oldFileName: string | null;
    newFileName: string;
}

interface BatchChangeLog {
    timestamp: string;
    blockId: string;
    newFileName: string;
    description: string;
    changes: LinkChangeLog[];
}

export default class LinkMaintainer extends Plugin {
    settings: LinkMaintainerSettings;
    private currentBatchLog: BatchChangeLog | null = null;
    private searchLinksHelper: SearchLinks;
    private blockReferenceManager: BlockReferenceManager;
    private linkReplacer: LinkReplacer;

    constructor(app: App, manifest: any) {
        super(app, manifest);
    }

    async logChange(change: LinkChangeLog): Promise<void> {
        if (!this.settings.enableChangeLogging) return;
        
        if (this.currentBatchLog) {
            this.currentBatchLog.changes.push(change);
        }
    }

    private initBatchLog(blockId: string, newFileName: string): void {
        this.currentBatchLog = {
            timestamp: new Date().toISOString(),
            blockId: blockId,
            newFileName: newFileName,
            description: `Block reference update: ^${blockId} → ${newFileName}`,
            changes: []
        };
    }

    private async writeBatchToLog(): Promise<void> {
        if (!this.settings.enableChangeLogging || !this.currentBatchLog) return;

        const logFile = this.app.vault.getAbstractFileByPath(this.settings.logFilePath);
        const batch = this.currentBatchLog;

        // Helper function to get clean note name for links
        const getNoteName = (filePath: string): string => {
            // Remove folders and extension, get just the note name
            return filePath.split('/').pop()?.replace(/\.md$/, '') || filePath;
        };

        // Get the first change to use as an example of the link update
        const exampleChange = batch.changes[0];
        const originalLink = exampleChange ? getCleanBlockRef(exampleChange.originalContent.trim()) : '';
        const updatedLink = exampleChange ? getCleanBlockRef(exampleChange.newContent.trim()) : '';

        const logEntry = [
            `## Batch Update at ${batch.timestamp}`,
            '',
            `> Block reference update: ${batch.blockId} → ${getNoteName(batch.newFileName)}`,
            '',
            '### Details',
            '',
            `- **Block ID**: \`${batch.blockId}\``,
            `- Original Link: \`${originalLink}\``,
            `- Updated Link: \`${updatedLink}\``,
            `- **Files Affected**: ${batch.changes.length}`,
            '',
            '### Changes',
            '',
            batch.changes.map(change => 
                `- [[${getNoteName(change.originalFile)}]] (Line ${change.lineNumber + 1})`
            ).join('\n'),
            '',
            '---\n'
        ].join('\n');

        if (!(logFile instanceof TFile)) {
            // Create log file if it doesn't exist
            await this.app.vault.create(this.settings.logFilePath, logEntry);
        } else {
            // Append to existing log file
            const currentContent = await this.app.vault.read(logFile);
            await this.app.vault.modify(logFile, logEntry + currentContent);
        }

        // Clear the current batch
        this.currentBatchLog = null;
    }

    async showConfirmationDialog(matches: LinkMatch[], newFileName: string): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = new Modal(this.app);
            modal.titleEl.setText('Confirm Link Updates');
            
            const content = modal.contentEl;
            content.empty();
            
            content.createEl('p', {
                text: `You are about to update ${matches.length} block reference${matches.length > 1 ? 's' : ''} to point to "${newFileName}".`,
                attr: { style: 'margin-bottom: 12px;' }
            });

            if (matches.length > 0) {
                const list = content.createEl('div', {
                    cls: 'link-maintainer-changes-list',
                    attr: { style: 'max-height: 200px; overflow-y: auto; margin-bottom: 12px; padding: 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px;' }
                });

                matches.forEach((match, index) => {
                    const item = list.createEl('div', {
                        attr: { style: 'margin-bottom: 8px; font-size: 0.9em;' }
                    });
                    item.createEl('div', {
                        text: `${index + 1}. In file: ${match.file}`,
                        attr: { style: 'color: var(--text-muted);' }
                    });
                    item.createEl('div', {
                        text: match.lineContent,
                        attr: { style: 'font-family: monospace; white-space: pre-wrap; margin-top: 4px;' }
                    });
                });
            }

            const warningEl = content.createEl('p', {
                cls: 'link-maintainer-warning',
                text: 'This action cannot be automatically undone. Changes will be logged if logging is enabled.',
                attr: { style: 'color: var(--text-warning); margin-bottom: 12px;' }
            });

            // Buttons container
            const buttonContainer = content.createEl('div', {
                attr: { style: 'display: flex; justify-content: flex-end; gap: 8px;' }
            });

            // Cancel button
            buttonContainer.createEl('button', {
                text: 'Cancel',
                attr: { style: 'padding: 4px 12px;' }
            }).onclick = () => {
                modal.close();
                resolve(false);
            };

            // Confirm button
            const confirmButton = buttonContainer.createEl('button', {
                cls: 'mod-cta',
                text: 'Confirm Updates',
                attr: { style: 'padding: 4px 12px;' }
            });
            confirmButton.onclick = () => {
                modal.close();
                resolve(true);
            };

            modal.open();
        });
    }

    async onload() {
        await this.loadSettings();
        
        // Initialize helpers after settings are loaded
        this.linkReplacer = new LinkReplacer({
            plugin: this,
            settings: this.settings,
            initBatchLog: this.initBatchLog.bind(this),
            showConfirmationDialog: this.showConfirmationDialog.bind(this),
            logChange: this.logChange.bind(this),
            writeBatchToLog: this.writeBatchToLog.bind(this),
            clearBatchLog: () => { this.currentBatchLog = null; }
        });
        this.searchLinksHelper = new SearchLinks(this.app, this.linkReplacer.replaceLinks.bind(this.linkReplacer));
        this.blockReferenceManager = new BlockReferenceManager(
            this.app,
            this.linkReplacer.replaceLinks.bind(this.linkReplacer),
            this.settings.replaceExistingBlockLinks
        );

        this.addSettingTab(new LinkMaintainerSettingTab(this.app, this));

        this.addCommand({
            id: 'link-maintainer-update-references',
            name: 'Update link references',
            callback: () => this.showSearchModal(),
        });

        this.addCommand({
            id: 'update-block-references',
            name: 'Update block references from selection',
            editorCallback: (editor) => {
                const selection = editor.getSelection();
                if (!selection) {
                    new Notice('Please select some text first');
                    return;
                }

                const info = extractBlockInfo(selection, this.app);
                if (!info) {
                    new Notice('No valid block ID found in selection');
                    return;
                }

                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    new Notice('No active file');
                    return;
                }

                this.searchAndUpdateBlockReferences(info.blockId, activeFile.basename);
            }
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    showSearchModal() {
        new SearchModal(
            this.app, 
            (oldFileName: string, newFileName: string, reference: string | null, linkType: LinkType) => {
                this.searchLinks(oldFileName, newFileName, reference, linkType);
            }
        ).open();
    }

    async searchLinks(oldFileName: string, newFileName: string, reference: string | null, linkType: LinkType) {
        return this.searchLinksHelper.searchLinks(oldFileName, newFileName, reference, linkType);
    }

    async searchAndUpdateBlockReferences(blockId: string, newFileName: string) {
        return this.blockReferenceManager.searchAndUpdateBlockReferences(blockId, newFileName);
    }

    async replaceLinks(matches: LinkMatch[], newFileName: string, reference: string | null, linkType: LinkType) {
        return this.linkReplacer.replaceLinks(matches, newFileName, reference, linkType);
    }
}
