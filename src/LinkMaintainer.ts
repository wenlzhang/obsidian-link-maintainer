import { LinkMaintainerSettingTab } from "./LinkMaintainerSettingTab";
import { LinkMaintainerSettings, BatchChangeLog, LinkMatch, LinkType, ChangeEntry, ILinkMaintainer } from './types';
import { DEFAULT_SETTINGS } from './DEFAULT_SETTINGS';
import { SearchModal } from './SearchModal';
import { ResultsModal } from './ResultsModal';
import { TFile, Modal, Notice, Plugin, PluginManifest, Editor, App } from "obsidian";
import { getCleanBlockRef, extractBlockInfo } from "./utils";
import { SearchLinks } from './searchLinks';
import { LinkReplacer } from './LinkReplacer';
import { BlockReferenceManager } from './BlockReferenceManager';
import { ConfirmationDialog } from './ConfirmationDialog';
import { writeBatchToLog } from './BatchLogger';

export class LinkMaintainer extends Plugin implements ILinkMaintainer {
    public settings: LinkMaintainerSettings;
    public currentBatchLog: BatchChangeLog | null = null;
    public searchLinksHelper: SearchLinks;
    public linkReplacer: LinkReplacer;
    public blockReferenceManager: BlockReferenceManager;

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);
        this.settings = Object.assign({}, DEFAULT_SETTINGS);
        this.linkReplacer = new LinkReplacer({
            plugin: this,
            settings: this.settings,
            initBatchLog: this.initBatchLog.bind(this),
            showConfirmationDialog: this.showConfirmationDialog.bind(this),
            logChange: this.logChange.bind(this),
            writeBatchToLog: this.writeBatchToLog.bind(this),
            clearBatchLog: this.clearBatchLog.bind(this)
        });
        this.searchLinksHelper = new SearchLinks(app, this.linkReplacer.replaceLinks.bind(this.linkReplacer));
        this.blockReferenceManager = new BlockReferenceManager(app, this.linkReplacer.replaceLinks.bind(this.linkReplacer), this.settings.replaceExistingBlockLinks);
    }

    async onload(): Promise<void> {
        await super.onload();
        
        // Load manifest and settings
        await this.loadSettings();

        // Add setting tab
        this.addSettingTab(new LinkMaintainerSettingTab(this.app, this));

        // Add commands
        this.addCommand({
            id: 'link-maintainer-update-references',
            name: 'Update link references',
            callback: () => this.showSearchModal(),
        });

        this.addCommand({
            id: 'update-block-references',
            name: 'Update block references from selection',
            editorCallback: (editor: Editor) => {
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

    async logChange(change: ChangeEntry): Promise<void> {
        if (!this.settings.enableChangeLogging) return;

        if (this.currentBatchLog) {
            this.currentBatchLog.changes.push(change);
        }
    }

    public initBatchLog(blockId: string, newFileName: string): void {
        this.currentBatchLog = {
            timestamp: new Date().toISOString(),
            blockId,
            newFileName,
            description: `Block reference update: ^${blockId} → ${newFileName}`,
            changes: []
        };
    }

    public async writeBatchToLog(): Promise<void> {
        if (this.currentBatchLog && this.settings.enableChangeLogging) {
            await writeBatchToLog(this.app, this.settings.logFilePath, this.currentBatchLog);
        }
        this.clearBatchLog();
    }

    async showConfirmationDialog(matches: LinkMatch[], newFileName: string, reference: string | null, linkType: LinkType): Promise<void> {
        const dialog = new ConfirmationDialog(this.app, matches, newFileName);
        const confirmed = await dialog.showDialog();
        if (!confirmed) {
            throw new Error('User cancelled operation');
        }
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
        await this.blockReferenceManager.searchAndUpdateBlockReferences(blockId, newFileName);
    }

    async searchBlockReferences(blockId: string, excludeFileName: string): Promise<LinkMatch[]> {
        return this.blockReferenceManager.searchBlockReferences(blockId, excludeFileName);
    }

    async replaceLinks(
        matches: LinkMatch[],
        newFileName: string,
        reference: string | null,
        linkType: LinkType
    ): Promise<void> {
        // Initialize batch log only if we have both required parameters
        if (reference && reference.trim() && newFileName && newFileName.trim()) {
            this.initBatchLog(reference, newFileName);
        }

        // If confirmation dialog is enabled, show it
        if (this.settings.showConfirmationDialog) {
            await this.showConfirmationDialog(matches, newFileName, reference, linkType);
        }

        // Iterate over each match
        for (const match of matches) {
            const file = this.app.vault.getAbstractFileByPath(match.file);
            if (!(file instanceof TFile)) {
                continue;
            }

            const content = await this.app.vault.read(file);
            const lines = content.split('\n');
            const line = lines[match.lineNumber];

            let newLine: string;
            if (match.oldFileName) {
                // If old file name is present, replace complete link
                const oldLinkPattern = new RegExp(`\\[\\[${match.oldFileName}#\\^${reference}(?:\\|[^\\]]+)?\\]\\]`);
                newLine = line.replace(oldLinkPattern, `[[${newFileName}#^${reference}]]`);
            } else {
                // If only block ID is present, add complete link
                const blockIdPattern = new RegExp(`\\^${reference}(?=[\\s\\]\\n]|$)`);
                newLine = line.replace(blockIdPattern, `[[${newFileName}#^${reference}]]`);
            }

            if (newLine !== line) {
                // Log the change
                await this.logChange({
                    timestamp: new Date().toISOString(),
                    originalFile: match.file,
                    lineNumber: match.lineNumber,
                    originalContent: line,
                    newContent: newLine,
                    blockId: reference || '',
                    oldFileName: match.oldFileName,
                    newFileName: newFileName
                });

                // Update the line
                lines[match.lineNumber] = newLine;
                await this.app.vault.modify(file, lines.join('\n'));
            }
        }

        // Write batch log to file
        await this.writeBatchToLog();
    }

    clearBatchLog(): void {
        this.currentBatchLog = null;
    }

    addRibbonIcon(icon: string, title: string, callback: (evt: MouseEvent) => void) {
        return super.addRibbonIcon(icon, title, callback);
    }

    addStatusBarItem() {
        return super.addStatusBarItem();
    }
}
