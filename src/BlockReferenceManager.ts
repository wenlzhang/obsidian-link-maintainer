import { App, Notice, TFile } from "obsidian";
import { LinkMatch, LinkType, LinkMaintainerSettings } from "./types";
import { ResultsModal } from "./ResultsModal";
import { BulkUpdateModal } from "./BulkUpdateModal";

export class BlockReferenceManager {
    constructor(
        private app: App,
        private replaceLinks: (
            matches: LinkMatch[],
            newFileName: string,
            reference: string | null,
            linkType: LinkType,
        ) => void,
        private replaceExistingBlockLinks: boolean,
        private settings: LinkMaintainerSettings,
    ) {}

    async searchAndUpdateBlockReferences(blockId: string, newFileName: string) {
        const { matches, alreadyUpdatedCount } =
            await this.searchBlockReferences(blockId, newFileName);

        if (matches.length === 0) {
            if (alreadyUpdatedCount > 0) {
                new Notice(
                    `All found references (${alreadyUpdatedCount}) are already up to date`,
                );
            } else {
                new Notice("No references found");
            }
            return;
        }

        new ResultsModal(
            this.app,
            matches,
            newFileName,
            blockId,
            LinkType.BLOCK,
            this.replaceLinks.bind(this),
        ).open();
    }

    async findAndUpdateAllInvalidBlockReferences(currentFile: TFile) {
        // 1. Find invalid outgoing references (references IN current note pointing elsewhere)
        const outgoingInvalidRefs =
            await this.findInvalidOutgoingReferences(currentFile);

        // 2. Find invalid incoming references (references TO block IDs defined in current note)
        const incomingInvalidRefs =
            await this.findInvalidIncomingReferences(currentFile);

        // Combine both types of invalid references
        const allInvalidRefs = [...outgoingInvalidRefs, ...incomingInvalidRefs];

        if (allInvalidRefs.length === 0) {
            new Notice("No invalid block references found");
            return;
        }

        // Collect ALL matches and process them together to show ONE confirmation dialog
        const allMatches: LinkMatch[] = [];
        const updatePlan: Array<{
            matches: LinkMatch[];
            correctFileName: string;
            blockId: string;
        }> = [];

        for (const ref of allInvalidRefs) {
            allMatches.push(...ref.matches);
            updatePlan.push({
                matches: ref.matches,
                correctFileName: ref.correctFileName,
                blockId: ref.blockId,
            });
        }

        // Show ONE consolidated modal with all the invalid references
        new BulkUpdateModal(this.app, allMatches, updatePlan, async () => {
            // Temporarily disable confirmation to avoid multiple dialogs
            const originalSetting = this.settings.showConfirmationDialog;
            this.settings.showConfirmationDialog = false;

            try {
                // Execute all updates
                for (const plan of updatePlan) {
                    await this.replaceLinks(
                        plan.matches,
                        plan.correctFileName,
                        plan.blockId,
                        LinkType.BLOCK,
                    );
                }
            } finally {
                // Restore original setting
                this.settings.showConfirmationDialog = originalSetting;
            }
        }).open();
    }

    private async searchBlockReferences(
        blockId: string,
        currentFileName: string,
    ): Promise<{ matches: LinkMatch[]; alreadyUpdatedCount: number }> {
        const matches: LinkMatch[] = [];
        let alreadyUpdatedCount = 0;

        // Get both markdown and canvas files
        const allFiles = this.app.vault.getFiles();
        const relevantFiles = allFiles.filter(
            (file) => file.extension === "md" || file.extension === "canvas",
        );

        // Create regex patterns
        // For files other than current: match both full wikilinks and bare block references
        const blockIdPattern = new RegExp(
            `\\[\\[([^\\]]+)#\\^${blockId}(?:\\|[^\\]]+)?\\]\\]|\\^${blockId}(?=[\\s\\]\\n]|$)`,
        );
        // For current file: only match wikilinks (to avoid matching the block definition itself)
        const currentFileBlockPattern = new RegExp(
            `\\[\\[([^\\]]+)#\\^${blockId}(?:\\|[^\\]]+)?\\]\\]`,
        );
        const updatedLinkPattern = new RegExp(
            `\\[\\[${currentFileName}#\\^${blockId}(?:\\|[^\\]]+)?\\]\\]`,
        );

        for (const file of relevantFiles) {
            // Read file content
            const content = await this.app.vault.read(file);

            if (file.extension === "canvas") {
                try {
                    // Parse canvas file as JSON
                    const canvasData = JSON.parse(content);

                    // Search through nodes for block references
                    if (canvasData.nodes) {
                        // Use for...of instead of forEach to properly handle async/await
                        for (const node of canvasData.nodes) {
                            if (node.text) {
                                // Use different pattern for current file vs other files
                                const isCurrentFile =
                                    file.basename === currentFileName;
                                const patternToUse = isCurrentFile
                                    ? currentFileBlockPattern
                                    : blockIdPattern;
                                const match = node.text.match(patternToUse);
                                if (match) {
                                    // Check if the link is already updated
                                    if (updatedLinkPattern.test(node.text)) {
                                        alreadyUpdatedCount++;
                                        continue;
                                    }

                                    // Extract filename (if it's a complete link)
                                    const linkMatch =
                                        node.text.match(/\[\[([^\]#|]+)/);
                                    const oldFileName = linkMatch
                                        ? linkMatch[1].trim()
                                        : null;

                                    if (oldFileName) {
                                        // Check if the block exists in the linked file
                                        const linkedFile =
                                            this.app.vault.getAbstractFileByPath(
                                                `${oldFileName}.md`,
                                            );
                                        if (linkedFile instanceof TFile) {
                                            const linkedContent =
                                                await this.app.vault.read(
                                                    linkedFile,
                                                );

                                            // If setting is false and the block exists in the linked file, skip this node
                                            if (
                                                !this
                                                    .replaceExistingBlockLinks &&
                                                linkedContent.includes(
                                                    `^${blockId}`,
                                                )
                                            ) {
                                                continue;
                                            }
                                        }
                                    }

                                    matches.push({
                                        file: file.path,
                                        lineContent: node.text,
                                        lineNumber:
                                            canvasData.nodes.indexOf(node),
                                        linkText: node.text,
                                        oldFileName: oldFileName,
                                        isCanvasNode: true,
                                        nodeId: node.id,
                                    });
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error(
                        `Error parsing canvas file ${file.path}:`,
                        error,
                    );
                    continue;
                }
            } else {
                // Handle markdown files
                const lines = content.split("\n");
                // Use different pattern for current file vs other files
                const isCurrentFile = file.basename === currentFileName;
                const patternToUse = isCurrentFile
                    ? currentFileBlockPattern
                    : blockIdPattern;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const match = line.match(patternToUse);
                    if (match) {
                        // Check if the link is already updated
                        if (updatedLinkPattern.test(line)) {
                            alreadyUpdatedCount++;
                            continue;
                        }

                        // Extract filename (if it's a complete link)
                        const linkMatch = line.match(/\[\[([^\]#|]+)/);
                        const oldFileName = linkMatch
                            ? linkMatch[1].trim()
                            : null;

                        if (oldFileName) {
                            // Check if the block exists in the linked file
                            const linkedFile =
                                this.app.vault.getAbstractFileByPath(
                                    `${oldFileName}.md`,
                                );
                            if (linkedFile instanceof TFile) {
                                const linkedContent =
                                    await this.app.vault.read(linkedFile);

                                // If setting is false and the block exists in the linked file, skip this line
                                if (
                                    !this.replaceExistingBlockLinks &&
                                    linkedContent.includes(`^${blockId}`)
                                ) {
                                    continue;
                                }
                            }
                        }

                        matches.push({
                            file: file.path,
                            lineContent: line,
                            lineNumber: i,
                            linkText: line,
                            oldFileName: oldFileName,
                        });
                    }
                }
            }
        }

        return { matches, alreadyUpdatedCount };
    }

    private async findInvalidOutgoingReferences(file: TFile): Promise<
        Array<{
            blockId: string;
            correctFileName: string;
            matches: LinkMatch[];
        }>
    > {
        const content = await this.app.vault.read(file);
        const lines = content.split("\n");
        const invalidRefs: Array<{
            blockId: string;
            correctFileName: string;
            matches: LinkMatch[];
        }> = [];

        // Regex to match block references: [[filename#^blockid]] or [[#^blockid]]
        const blockRefPattern =
            /\[\[([^|\]]*?)#\^([a-zA-Z0-9-]+)(?:\|[^\]]+)?\]\]/g;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let match;

            // Reset regex state
            blockRefPattern.lastIndex = 0;

            while ((match = blockRefPattern.exec(line)) !== null) {
                const linkedFileName = match[1].trim() || file.basename;
                const blockId = match[2];

                // Use existing validation logic
                const isValid = await this.isBlockReferenceValid(
                    linkedFileName,
                    blockId,
                );

                if (!isValid) {
                    // Find where the block actually exists
                    const actualFile = await this.findFileWithBlockId(blockId);

                    // Skip if block doesn't exist anywhere
                    if (!actualFile) {
                        continue;
                    }

                    const correctFileName = actualFile.basename;

                    // IMPORTANT: Skip self-references in current file
                    // If the reference is in the current file and points to current file, it's valid
                    if (actualFile.path === file.path) {
                        continue;
                    }

                    // Check if we already have this blockId in our invalidRefs
                    const existingRef = invalidRefs.find(
                        (ref) =>
                            ref.blockId === blockId &&
                            ref.correctFileName === correctFileName,
                    );

                    const linkMatch: LinkMatch = {
                        file: file.path,
                        lineContent: line,
                        lineNumber: i,
                        linkText: match[0],
                        oldFileName: linkedFileName,
                    };

                    if (existingRef) {
                        existingRef.matches.push(linkMatch);
                    } else {
                        invalidRefs.push({
                            blockId: blockId,
                            correctFileName: correctFileName,
                            matches: [linkMatch],
                        });
                    }
                }
            }
        }

        return invalidRefs;
    }

    private async findInvalidIncomingReferences(file: TFile): Promise<
        Array<{
            blockId: string;
            correctFileName: string;
            matches: LinkMatch[];
        }>
    > {
        // Find all block IDs defined in the current file
        const blockIds = await this.findBlockIdsInFile(file);

        if (blockIds.length === 0) {
            return [];
        }

        const invalidRefs: Array<{
            blockId: string;
            correctFileName: string;
            matches: LinkMatch[];
        }> = [];

        // For each block ID defined in current file, search for invalid references to it
        for (const blockId of blockIds) {
            const { matches } = await this.searchBlockReferences(
                blockId,
                file.basename,
            );

            if (matches.length > 0) {
                invalidRefs.push({
                    blockId: blockId,
                    correctFileName: file.basename,
                    matches: matches,
                });
            }
        }

        return invalidRefs;
    }

    private async findBlockIdsInFile(file: TFile): Promise<string[]> {
        const content = await this.app.vault.read(file);
        const lines = content.split("\n");
        const blockIds: string[] = [];

        // Regex to match block ID definitions: ^blockid at the end of a line
        const blockIdPattern = /\^([a-zA-Z0-9-]+)\s*$/;

        for (const line of lines) {
            const match = line.match(blockIdPattern);
            if (match) {
                blockIds.push(match[1]);
            }
        }

        return blockIds;
    }

    private async isBlockReferenceValid(
        fileName: string,
        blockId: string,
    ): Promise<boolean> {
        const linkedFile = this.app.vault.getAbstractFileByPath(
            `${fileName}.md`,
        );

        if (!(linkedFile instanceof TFile)) {
            return false;
        }

        const linkedContent = await this.app.vault.read(linkedFile);
        return linkedContent.includes(`^${blockId}`);
    }

    private async findFileWithBlockId(blockId: string): Promise<TFile | null> {
        const allFiles = this.app.vault.getMarkdownFiles();

        for (const file of allFiles) {
            const content = await this.app.vault.read(file);
            if (content.includes(`^${blockId}`)) {
                return file;
            }
        }

        return null;
    }
}
