import { App, TFile } from 'obsidian';
import { LinkMatch, LinkType } from './types';
import { ResultsModal } from './ResultsModal';

export class BlockReferenceManager {
    constructor(
        private app: App,
        private replaceLinks: (matches: LinkMatch[], newFileName: string, reference: string | null, linkType: LinkType) => void,
        private replaceExistingBlockLinks: boolean
    ) {}

    async searchAndUpdateBlockReferences(blockId: string, newFileName: string) {
        const matches = await this.searchBlockReferences(blockId, newFileName);
        if (matches.length > 0) {
            const modal = new ResultsModal(
                this.app,
                matches,
                newFileName,
                blockId,
                LinkType.BLOCK,
                this.replaceLinks
            );
            modal.open();
        }
    }

    public async searchBlockReferences(blockId: string, excludeFileName: string): Promise<LinkMatch[]> {
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
                            if (!this.replaceExistingBlockLinks && linkedContent.includes(`^${blockId}`)) {
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
}
