import { App, TFile } from "obsidian";
import { BatchChangeLog, ChangeEntry, LinkMaintainerSettings } from "./types";
import { getCleanBlockRef, getNoteName } from "./utils";

export async function writeBatchToLog(
    app: App,
    settings: LinkMaintainerSettings,
    currentBatchLog: BatchChangeLog | null,
): Promise<void> {
    if (!settings.enableChangeLogging || !currentBatchLog) return;

    const logFile = app.vault.getAbstractFileByPath(settings.logFilePath);
    const batch = currentBatchLog;

    // Get the first change to use as an example of the link update
    const exampleChange =
        batch.changes && batch.changes.length > 0 ? batch.changes[0] : null;
    const originalLink =
        exampleChange && exampleChange.originalContent
            ? getCleanBlockRef(exampleChange.originalContent.trim())
            : "";
    const updatedLink =
        exampleChange && exampleChange.newContent
            ? getCleanBlockRef(exampleChange.newContent.trim())
            : "";

    // Group changes by file type
    const markdownChanges =
        batch.changes?.filter(
            (change) => !change.originalFile.endsWith(".canvas"),
        ) || [];
    const canvasChanges =
        batch.changes?.filter((change) =>
            change.originalFile.endsWith(".canvas"),
        ) || [];

    const logEntry = [
        `## Batch update at ${batch.timestamp}`,
        "",
        `> Block reference update: ${batch.blockId} → ${getNoteName(batch.newFileName)}`,
        "",
        "### Details",
        "",
        `- **Block ID**: \`${batch.blockId}\``,
        `- Original link: \`${originalLink}\``,
        `- Updated link: \`${updatedLink}\``,
        `- **Files affected**: ${batch.changes?.length}`,
        "",
        "### Changes",
        "",
    ];

    // Add markdown changes with line numbers
    if (markdownChanges.length > 0) {
        logEntry.push(
            ...markdownChanges.map(
                (change) =>
                    `- [[${getNoteName(change.originalFile)}]] (Line ${change.lineNumber + 1})`,
            ),
        );
    }

    // Add canvas changes without line numbers
    if (canvasChanges.length > 0) {
        if (markdownChanges.length > 0) {
            logEntry.push(""); // Add spacing if we had markdown changes
        }
        logEntry.push(
            ...canvasChanges.map(
                (change) =>
                    `- [[${getNoteName(change.originalFile)}]] (Canvas)`,
            ),
        );
    }

    logEntry.push("", "---\n");

    const finalLogEntry = logEntry.join("\n");

    if (!(logFile instanceof TFile)) {
        // Create log file if it doesn't exist
        await app.vault.create(settings.logFilePath, finalLogEntry);
    } else {
        // Append to existing log file
        const currentContent = await app.vault.read(logFile);
        await app.vault.modify(logFile, finalLogEntry + currentContent);
    }
}
