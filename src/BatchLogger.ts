import { App, TFile } from 'obsidian';
import { BatchChangeLog, ChangeEntry, LinkMaintainerSettings } from './types';
import { getCleanBlockRef, getNoteName } from './utils';

export async function writeBatchToLog(
    app: App,
    settings: LinkMaintainerSettings,
    currentBatchLog: BatchChangeLog | null
): Promise<void> {
    if (!settings.enableChangeLogging || !currentBatchLog) return;

    const logFile = app.vault.getAbstractFileByPath(settings.logFilePath);
    const batch = currentBatchLog;

    // Get the first change to use as an example of the link update
    const exampleChange = batch.changes && batch.changes.length > 0 ? batch.changes[0] : null;
    const originalLink = exampleChange && exampleChange.originalContent ? getCleanBlockRef(exampleChange.originalContent.trim()) : '';
    const updatedLink = exampleChange && exampleChange.newContent ? getCleanBlockRef(exampleChange.newContent.trim()) : '';

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
        `- **Files Affected**: ${batch.changes?.length}`,
        '',
        '### Changes',
        '',
        batch.changes?.filter(change => change && change.originalFile)
            .map(change => 
                `- [[${getNoteName(change.originalFile)}]] (Line ${change.lineNumber + 1})`
            ).join('\n') || '',
        '',
        '---\n'
    ].join('\n');

    if (!(logFile instanceof TFile)) {
        // Create log file if it doesn't exist
        await app.vault.create(settings.logFilePath, logEntry);
    } else {
        // Append to existing log file
        const currentContent = await app.vault.read(logFile);
        await app.vault.modify(logFile, logEntry + currentContent);
    }
}
