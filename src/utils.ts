// Regular expressions for matching different types of links and references
import { App } from "obsidian";

export const REGEX = {
    // Match standalone block ID ^blockid
    BLOCK_ID: /\^([a-zA-Z0-9-]+)$/,
    // Match file with block ID filename#^blockid
    FILE_BLOCK_ID: /([^#\^]+)#\^([a-zA-Z0-9-]+)$/,
    // Match link content inside [[ up to # or |
    LINK_CONTENT: /\[\[([^\]#|]+)/,
};

/**
 * Gets a clean note name from a file path
 * @param filePath The file path to clean
 * @returns A clean note name without path or extension
 */
export function getNoteName(filePath: string | undefined | null): string {
    if (!filePath) return "Unknown File";
    // Remove folders and extension, get just the note name
    const parts = filePath.split("/");
    const fileName = parts.length > 0 ? parts[parts.length - 1] : filePath;
    return fileName.replace(/\.md$/, "");
}

/**
 * Extracts clean block reference from content
 * @param content The content containing the reference
 * @returns The cleaned reference
 */
export function getCleanBlockRef(content: string): string {
    const match = content.match(REGEX.LINK_CONTENT);
    if (match) {
        return match[1];
    }
    return content;
}

/**
 * Extracts block information from text
 * @param text The text to extract from
 * @param app The Obsidian app instance
 * @returns ExtractedInfo object or null if no valid block info found
 */
export interface ExtractedInfo {
    fileName: string;
    blockId: string;
}

export function extractBlockInfo(text: string, app: App): ExtractedInfo | null {
    // First try to match file with block ID pattern
    let match = text.match(REGEX.FILE_BLOCK_ID);
    if (match) {
        return {
            fileName: match[1],
            blockId: match[2],
        };
    }

    // Then try to match standalone block ID
    match = text.match(REGEX.BLOCK_ID);
    if (match) {
        // If only block ID is present, get filename from active file
        const activeFile = app.workspace.getActiveFile();
        if (activeFile) {
            return {
                fileName: getNoteName(activeFile.path),
                blockId: match[1],
            };
        }
    }

    return null;
}
