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
                try {
                    // Parse canvas file
                    const canvasData = JSON.parse(content);
                    let modified = false;

                    // Update nodes
                    if (canvasData.nodes) {
                        fileMatches.forEach(match => {
                            if (match.isCanvasNode && match.nodeId) {
                                const node = canvasData.nodes.find((n: any) => n.id === match.nodeId);
                                if (node && node.text) {
                                    const oldText = node.text;
                                    let newText: string;
                                    
                                    if (match.oldFileName) {
                                        // If old file name is present, replace complete link
                                        const oldLinkPattern = new RegExp(`\\[\\[${match.oldFileName}#\\^${reference}(?:\\|[^\\]]+)?\\]\\]`);
                                        newText = oldText.replace(oldLinkPattern, `[[${newFileName}#^${reference}]]`);
                                    } else {
                                        // If only block ID is present, add complete link
                                        const blockIdPattern = new RegExp(`\\^${reference}(?=[\\s\\]\\n]|$)`);
                                        newText = oldText.replace(blockIdPattern, `[[${newFileName}#^${reference}]]`);
                                    }

                                    if (newText !== oldText) {
                                        node.text = newText;
                                        modified = true;

                                        // Log the change
                                        this.deps.plugin.logChange({
                                            timestamp: new Date().toISOString(),
                                            originalFile: filePath,
                                            lineNumber: match.lineNumber,
                                            originalContent: oldText,
                                            newContent: newText,
                                            blockId: reference || '',
                                            oldFileName: match.oldFileName,
                                            newFileName: newFileName
                                        });
                                    }
                                }
                            }
                        });
                    }

                    if (modified) {
                        // Write updated canvas file
                        await this.deps.plugin.app.vault.modify(file, JSON.stringify(canvasData, null, 2));
                    }
                } catch (error) {
                    console.error(`Error updating canvas file ${filePath}:`, error);
                    continue;
                }
            } else {
                // Handle markdown files as before
                const lines = content.split('\n');
                let modified = false;

                fileMatches.forEach(match => {
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
                        modified = true;
                        lines[match.lineNumber] = newLine;

                        // Log the change
                        this.deps.plugin.logChange({
                            timestamp: new Date().toISOString(),
                            originalFile: filePath,
                            lineNumber: match.lineNumber,
                            originalContent: line,
                            newContent: newLine,
                            blockId: reference || '',
                            oldFileName: match.oldFileName,
                            newFileName: newFileName
                        });
                    }
                });

                if (modified) {
                    await this.deps.plugin.app.vault.modify(file, lines.join('\n'));
                }
            }
        }

        // Write batch log to file
        await this.deps.plugin.writeBatchToLog();
    }
}
