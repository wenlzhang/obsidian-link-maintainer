import { TFile } from 'obsidian';
import { LinkMatch, LinkType, BatchChangeLog } from './types';

export interface LinkReplacerDependencies {
    plugin: any;
    settings: { showConfirmationDialog: boolean };
    initBatchLog: (blockId: string, newFileName: string) => void;
    showConfirmationDialog: (matches: LinkMatch[], newFileName: string) => Promise<boolean>;
    logChange: (change: BatchChangeLog) => Promise<void>;
    writeBatchToLog: () => Promise<void>;
    clearBatchLog: () => void;
}

export class LinkReplacer {
    constructor(private deps: LinkReplacerDependencies) {}

    async replaceLinks(matches: LinkMatch[], newFileName: string, reference: string | null, linkType: LinkType) {
        // Initialize batch log
        if (reference) {
            this.deps.plugin.initBatchLog(reference, newFileName);
        }

        // If confirmation dialog is enabled, show it
        if (this.deps.settings.showConfirmationDialog) {
            const confirmed = await this.deps.plugin.showConfirmationDialog(matches, newFileName);
            if (!confirmed) {
                this.deps.plugin.clearBatchLog(); // Clear batch log if cancelled
                return;
            }
        }

        // Iterate over each match
        for (const match of matches) {
            const file = this.deps.plugin.app.vault.getAbstractFileByPath(match.file);
            if (!(file instanceof TFile)) {
                continue;
            }

            const content = await this.deps.plugin.app.vault.read(file);
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
                await this.deps.plugin.logChange({
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
                await this.deps.plugin.app.vault.modify(file, lines.join('\n'));
            }
        }

        // Write batch log to file
        await this.deps.plugin.writeBatchToLog();
    }
}
