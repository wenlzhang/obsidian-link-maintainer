import { TFile, Modal, Notice } from "obsidian";
import { LinkMaintainerSettingTab } from "./LinkMaintainerSettingTab";
import { LinkMaintainerSettings, BatchChangeLog, LinkChangeLog, LinkMatch, extractBlockInfo, DEFAULT_SETTINGS, LinkType } from "./main";
import { ResultsModal } from "./ResultsModal";
import { SearchModal } from "./SearchModal";


export default class LinkMaintainer extends Plugin {
    settings: LinkMaintainerSettings;
    private currentBatchLog: BatchChangeLog | null = null;

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

        // Helper function to get clean block reference
        const getCleanBlockRef = (content: string): string => {
            const match = content.match(/\[\[([^\]]+?)(?:\|[^\]]+)?\]\]|(\^[a-zA-Z0-9]+)/);
            if (match) {
                // If it's a full link, return just the path part
                return match[1] || match[2] || content;
            }
            return content;
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
            batch.changes.map(change => `- [[${getNoteName(change.originalFile)}]] (Line ${change.lineNumber + 1})`
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

                const info = extractBlockInfo(selection);
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
        const matches: LinkMatch[] = [];
        const files = this.app.vault.getMarkdownFiles();

        const escapedOldFileName = oldFileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedReference = reference ? reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';

        let pattern: string;
        switch (linkType) {
            case LinkType.BLOCK:
                pattern = `(!?\\[\\[)${escapedOldFileName}\\s*#\\^${escapedReference}(\\|[^\\]]+)?\\]\\]`;
                break;
            case LinkType.HEADING:
                pattern = `(!?\\[\\[)${escapedOldFileName}\\s*#${escapedReference}(\\|[^\\]]+)?\\]\\]`;
                break;
            default:
                pattern = `(!?\\[\\[)${escapedOldFileName}(\\|[^\\]]+)?\\]\\]`;
        }

        const regex = new RegExp(pattern, 'g');

        for (const file of files) {
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');

            lines.forEach((line, index) => {
                let match;
                while ((match = regex.exec(line)) !== null) {
                    matches.push({
                        file: file.path,
                        lineContent: line,
                        lineNumber: index,
                        linkText: match[0],
                    });
                }
            });
        }

        new ResultsModal(
            this.app,
            matches,
            newFileName,
            reference,
            linkType,
            (matches, newFileName, reference, linkType) => {
                this.replaceLinks(matches, newFileName, reference, linkType);
            }
        ).open();
    }

    async searchAndUpdateBlockReferences(blockId: string, newFileName: string) {
        const matches = await this.searchBlockReferences(blockId, newFileName);
        if (matches.length === 0) {
            new Notice('No references found');
            return;
        }

        new ResultsModal(
            this.app,
            matches,
            newFileName,
            blockId,
            LinkType.BLOCK,
            this.replaceLinks.bind(this)
        ).open();
    }

    async searchBlockReferences(blockId: string, excludeFileName: string): Promise<LinkMatch[]> {
        const matches: LinkMatch[] = [];
        const files = this.app.vault.getMarkdownFiles();

        // Create regex pattern to match block ID references
        const blockIdPattern = new RegExp(`\\[\\[([^\\]]+)#\\^${blockId}(?:\\|[^\\]]+)?\\]\\]|\\^${blockId}(?=[\\s\\]\\n]|$)`);

        for (const file of files) {
            // Exclude the new file (we don't need to update references in it)
            if (file.basename === excludeFileName) {
                continue;
            }

            const content = await this.app.vault.read(file);
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Use regex to match complete block ID
                const match = line.match(blockIdPattern);
                if (match) {
                    // Extract filename (if it's a complete link)
                    const linkMatch = line.match(/\[\[([^\]#|]+)/);
                    const oldFileName = linkMatch ? linkMatch[1].trim() : null;

                    if (oldFileName) {
                        // Check if the block exists in the linked file
                        const linkedFile = this.app.vault.getAbstractFileByPath(`${oldFileName}.md`);
                        if (linkedFile instanceof TFile) {
                            const linkedContent = await this.app.vault.read(linkedFile);

                            // If setting is false and the block exists in the linked file, skip it
                            if (!this.settings.replaceExistingBlockLinks && linkedContent.includes(`^${blockId}`)) {
                                continue;
                            }
                        }
                    }

                    matches.push({
                        file: file.path,
                        lineContent: line,
                        lineNumber: i,
                        linkText: line,
                        oldFileName: oldFileName
                    });
                }
            }
        }

        return matches;
    }

    async replaceLinks(matches: LinkMatch[], newFileName: string, reference: string | null, linkType: LinkType) {
        // Initialize batch log
        if (reference) {
            this.initBatchLog(reference, newFileName);
        }

        // If confirmation dialog is enabled, show it
        if (this.settings.showConfirmationDialog) {
            const confirmed = await this.showConfirmationDialog(matches, newFileName);
            if (!confirmed) {
                this.currentBatchLog = null; // Clear batch log if cancelled
                return;
            }
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
}
