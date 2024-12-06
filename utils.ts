// Regular expressions for matching different types of links and references
import { App } from 'obsidian';

export const REGEX = {
    // Match complete block reference links [[filename#^blockid]]
    BLOCK_LINK: /\[\[([^\]]+)#\^([^\]\|]+)\]\]/,
    // Match standalone block ID ^blockid
    BLOCK_ID: /\^([^\s\]]+)/,
    // Match full link with optional alias
    FULL_LINK_WITH_ALIAS: /\[\[([^\]]+?)(?:\|[^\]]+)?\]\]|(\^[a-zA-Z0-9]+)/
};

/**
 * Extracts clean block reference from content
 * @param content The content containing the reference
 * @returns The cleaned reference
 */
export function getCleanBlockRef(content: string): string {
    const match = content.match(REGEX.FULL_LINK_WITH_ALIAS);
    if (match) {
        // If it's a full link, return just the path part
        return match[1] || match[2] || content;
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
    // First try to match complete block reference
    let match = text.match(REGEX.BLOCK_LINK);
    if (match) {
        return {
            fileName: match[1],
            blockId: match[2]
        };
    }
    
    // Then try to match standalone block ID
    match = text.match(REGEX.BLOCK_ID);
    if (match) {
        // If only block ID is present, get filename from active file
        const activeFile = app.workspace.getActiveFile();
        if (activeFile) {
            return {
                fileName: activeFile.basename,
                blockId: match[1]
            };
        }
    }
    
    return null;
}
