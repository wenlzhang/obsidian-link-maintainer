import { TFile, Notice } from 'obsidian';
import { LinkMatch, LinkType, BatchChangeLog, ChangeEntry } from './types';
import { getNoteName } from './utils';

export interface LinkReplacerDependencies {
    plugin: any;
    settings: { showConfirmationDialog: boolean };
    initBatchLog: (blockId: string, newFileName: string) => void;
    showConfirmationDialog: (matches: LinkMatch[], newFileName: string) => Promise<boolean>;
    logChange: (change: ChangeEntry) => Promise<void>;
    writeBatchToLog: () => Promise<void>;
    clearBatchLog: () => void;
}

export class LinkReplacer {
    constructor(private deps: LinkReplacerDependencies) {}

    async replaceLinks(matches: LinkMatch[], newFileName: string, reference: string | null, linkType: LinkType) {
        // Initialize batch log
        if (reference) {
            this.deps.initBatchLog(reference, newFileName);
        }

        // If confirmation dialog is enabled, show it
        if (this.deps.settings.showConfirmationDialog) {
            const confirmed = await this.deps.showConfirmationDialog(matches, newFileName);
            if (!confirmed) {
                this.deps.clearBatchLog(); // Clear batch log if cancelled
                return;
            }
        }

        let totalUpdatedCount = 0;

        // Group matches by file to avoid multiple reads/writes to the same file
        const matchesByFile = new Map<string, LinkMatch[]>();
        matches.forEach(match => {
            const fileMatches = matchesByFile.get(match.file) || [];
            fileMatches.push(match);
            matchesByFile.set(match.file, fileMatches);
        });

        // Process each file
        for (const [filePath, fileMatches] of matchesByFile) {
            const file = this.deps.plugin.app.vault.getAbstractFileByPath(filePath);
            if (!(file instanceof TFile)) {
                continue;
            }

            const content = await this.deps.plugin.app.vault.read(file);

            if (file.extension === 'canvas') {
                const { modified, updateCount } = await this.updateCanvasFile(
                    file,
                    content,
                    fileMatches,
                    newFileName,
                    reference,
                    filePath
                );
                if (modified) {
                    totalUpdatedCount += updateCount;
                }
            } else {
                const { modified, updateCount } = await this.updateMarkdownFile(
                    file,
                    content,
                    fileMatches,
                    newFileName,
                    reference,
                    filePath
                );
                if (modified) {
                    totalUpdatedCount += updateCount;
                }
            }
        }

        // Write batch log if there were any updates
        if (totalUpdatedCount > 0) {
            await this.deps.writeBatchToLog();
            new Notice(`Successfully updated ${totalUpdatedCount} link${totalUpdatedCount === 1 ? '' : 's'} to "${getNoteName(newFileName)}"`);
        } else {
            new Notice('No links needed updating');
        }
    }

    private async updateCanvasFile(
        file: TFile,
        content: string,
        matches: LinkMatch[],
        newFileName: string,
        reference: string | null,
        filePath: string
    ): Promise<{ modified: boolean; updateCount: number }> {
        let modified = false;
        let updateCount = 0;

        try {
            const canvasData = JSON.parse(content);
            if (!canvasData.nodes) return { modified, updateCount };

            matches.forEach(match => {
                if (!match.isCanvasNode || !match.nodeId) return;

                const node = canvasData.nodes.find((n: any) => n.id === match.nodeId);
                if (!node?.text) return;

                const { text: newText, updated } = this.updateNodeText(
                    node.text,
                    match,
                    newFileName,
                    reference,
                    filePath
                );

                if (updated) {
                    node.text = newText;
                    modified = true;
                    updateCount++;
                }
            });

            if (modified) {
                await this.deps.plugin.app.vault.modify(file, JSON.stringify(canvasData, null, 2));
            }
        } catch (error) {
            console.error(`Error updating canvas file ${filePath}:`, error);
        }

        return { modified, updateCount };
    }

    private async updateMarkdownFile(
        file: TFile,
        content: string,
        matches: LinkMatch[],
        newFileName: string,
        reference: string | null,
        filePath: string
    ): Promise<{ modified: boolean; updateCount: number }> {
        let modified = false;
        let updateCount = 0;
        const lines = content.split('\n');

        matches.forEach(match => {
            const line = lines[match.lineNumber];
            const { text: newLine, updated } = this.updateNodeText(
                line,
                match,
                newFileName,
                reference,
                filePath
            );

            if (updated) {
                lines[match.lineNumber] = newLine;
                modified = true;
                updateCount++;
            }
        });

        if (modified) {
            await this.deps.plugin.app.vault.modify(file, lines.join('\n'));
        }

        return { modified, updateCount };
    }

    private updateNodeText(
        text: string,
        match: LinkMatch,
        newFileName: string,
        reference: string | null,
        filePath: string
    ): { text: string; updated: boolean } {
        // Check if already updated
        const existingLinkPattern = new RegExp(`\\[\\[${newFileName}#\\^${reference}(?:\\|[^\\]]+)?\\]\\]`);
        if (existingLinkPattern.test(text)) {
            return { text, updated: false };
        }

        let newText: string;
        if (match.oldFileName) {
            const oldLinkPattern = new RegExp(`\\[\\[${match.oldFileName}#\\^${reference}(?:\\|[^\\]]+)?\\]\\]`);
            newText = text.replace(oldLinkPattern, `[[${newFileName}#^${reference}]]`);
        } else {
            const blockIdPattern = new RegExp(`\\^${reference}(?=[\\s\\]\\n]|$)`);
            newText = text.replace(blockIdPattern, `[[${newFileName}#^${reference}]]`);
        }

        if (newText !== text) {
            // Create a change entry that matches the BatchChangeLog interface
            const changeEntry: ChangeEntry = {
                originalContent: text,
                newContent: newText,
                lineNumber: match.lineNumber,
                originalFile: filePath
            };

            // Just log the change entry, not the whole batch
            this.deps.logChange(changeEntry);
            
            return { text: newText, updated: true };
        }

        return { text, updated: false };
    }
}
