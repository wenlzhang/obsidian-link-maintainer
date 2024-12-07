import { App, Plugin, PluginManifest, Notice, TFile, Modal, Editor } from 'obsidian';
import { getCleanBlockRef, extractBlockInfo } from './utils';
import { LinkMaintainerSettingTab } from './LinkMaintainerSettingTab';
import { DEFAULT_SETTINGS } from './DEFAULT_SETTINGS';
import { LinkMaintainerSettings, BatchChangeLog, LinkMatch, LinkType, ChangeEntry, ILinkMaintainer } from './types';
import { SearchLinks } from './searchLinks';
import { LinkReplacer } from './LinkReplacer';
import { BlockReferenceManager } from './BlockReferenceManager';
import { ConfirmationDialog } from './ConfirmationDialog';
import { writeBatchToLog } from './BatchLogger';

import { SearchModal } from './SearchModal';

export class LinkMaintainer extends Plugin implements ILinkMaintainer {
    public settings: LinkMaintainerSettings;
    public currentBatchLog: BatchChangeLog | null = null;
    public searchLinksHelper: SearchLinks;
    public blockReferenceManager: BlockReferenceManager;
    public linkReplacer: LinkReplacer;

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

    async onload() {
        await this.loadSettings();
        
        // Initialize helpers after settings are loaded
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

    clearBatchLog(): void {
        this.currentBatchLog = null;
    }
}
