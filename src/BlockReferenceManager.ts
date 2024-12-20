import { App, Notice, TFile } from "obsidian";
import { LinkMatch, LinkType } from "./types";
import { ResultsModal } from "./ResultsModal";

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

    private async searchBlockReferences(
        blockId: string,
        excludeFileName: string,
    ): Promise<{ matches: LinkMatch[]; alreadyUpdatedCount: number }> {
        const matches: LinkMatch[] = [];
        let alreadyUpdatedCount = 0;

        // Get both markdown and canvas files
        const allFiles = this.app.vault.getFiles();
        const relevantFiles = allFiles.filter(
            (file) =>
                (file.extension === "md" || file.extension === "canvas") &&
                file.basename !== excludeFileName,
        );

        // Create regex patterns
        const blockIdPattern = new RegExp(
            `\\[\\[([^\\]]+)#\\^${blockId}(?:\\|[^\\]]+)?\\]\\]|\\^${blockId}(?=[\\s\\]\\n]|$)`,
        );
        const updatedLinkPattern = new RegExp(
            `\\[\\[${excludeFileName}#\\^${blockId}(?:\\|[^\\]]+)?\\]\\]`,
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
                                const match = node.text.match(blockIdPattern);
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

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const match = line.match(blockIdPattern);
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
}
