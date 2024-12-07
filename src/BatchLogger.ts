import { App, TFile } from 'obsidian';
import { BatchChangeLog, ChangeEntry, LinkMaintainerSettings } from './types';
import { getCleanBlockRef } from './utils';

export async function writeBatchToLog(
    app: App,
    logFilePath: string,
    currentBatchLog: BatchChangeLog | null
): Promise<void> {
    if (!currentBatchLog) return;

    const logFile = app.vault.getAbstractFileByPath(logFilePath);
    const batch = currentBatchLog;

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
        await app.vault.create(logFilePath, logEntry);
    } else {
        // Append to existing log file
        const currentContent = await app.vault.read(logFile);
        await app.vault.modify(logFile, logEntry + currentContent);
    }
}
