import { App, Modal, TFile, MarkdownView } from "obsidian";
import { LinkMatch, LinkType } from "./types";

export class ResultsModal extends Modal {
    matches: LinkMatch[];
    newFileName: string;
    reference: string | null;
    linkType: LinkType;
    onConfirm: (
        matches: LinkMatch[],
        newFileName: string,
        reference: string | null,
        linkType: LinkType,
    ) => void;

    constructor(
        app: App,
        matches: LinkMatch[],
        newFileName: string,
        reference: string | null,
        linkType: LinkType,
        onConfirm: (
            matches: LinkMatch[],
            newFileName: string,
            reference: string | null,
            linkType: LinkType,
        ) => void,
    ) {
        super(app);
        this.matches = matches;
        this.newFileName = newFileName;
        this.reference = reference ?? null;
        this.linkType = linkType;
        this.onConfirm = onConfirm;
    }

    onOpen(): void {
        const { contentEl } = this;
        const self = this;

        contentEl.empty();

        // Add modal class
        contentEl.addClass("link-maintainer-modal");

        // Create info section
        const infoSection = contentEl.createDiv({
            cls: "link-maintainer-info",
        });

        // Block ID
        infoSection.createEl("div", {
            cls: "link-maintainer-info-item",
            text: `Block ID: ^${self.reference}`,
        });

        // Get the old file name from the first match
        const oldFileName = self.matches[0]?.oldFileName || "";
        if (oldFileName) {
            infoSection.createEl("div", {
                cls: "link-maintainer-info-item",
                text: `Old file name: ${oldFileName}`,
            });
        }

        // New file name
        infoSection.createEl("div", {
            cls: "link-maintainer-info-item",
            text: `New file name: ${self.newFileName}`,
        });

        // Match list title
        contentEl.createEl("h3", { text: "Found references:" });

        // Group matches by file type
        const markdownMatches = self.matches.filter(
            (match) => !match.isCanvasNode,
        );
        const canvasMatches = self.matches.filter(
            (match) => match.isCanvasNode,
        );

        const matchList = contentEl.createEl("div", {
            cls: "link-maintainer-match-list",
        });

        // Function to create match item
        const createMatchItem = (
            match: LinkMatch,
            index: number,
            fileType: string,
        ) => {
            const matchItem = matchList.createEl("div", {
                cls: "link-maintainer-match-item",
            });

            // Create file link area
            const fileInfoContainer = matchItem.createEl("div", {
                cls: "link-maintainer-file-info",
            });

            // Display file number and type
            fileInfoContainer.createSpan({
                text: `${fileType} ${index + 1}: `,
            });

            // Create clickable file link
            const file = self.app.vault.getAbstractFileByPath(match.file);
            if (file instanceof TFile) {
                const fileName = file.basename;
                const fileLink = fileInfoContainer.createEl("a", {
                    text: `[[${fileName}${match.isCanvasNode ? ".canvas" : ".md"}]]`,
                    cls: "link-maintainer-file-link",
                });
                fileLink.addEventListener("click", async (event) => {
                    // Open file and jump to specified line
                    const leaf = self.app.workspace.getLeaf();
                    await leaf.openFile(file);
                    const view = leaf.view as MarkdownView;
                    if (view.editor) {
                        const pos = { line: match.lineNumber, ch: 0 };
                        view.editor.setCursor(pos);
                        view.editor.scrollIntoView(
                            { from: pos, to: pos },
                            true,
                        );
                    }
                });
            }

            // Display line number or node info
            if (match.isCanvasNode) {
                matchItem.createEl("div", {
                    cls: "link-maintainer-line-number",
                    text: `Node ID: ${match.nodeId}`,
                });
            } else {
                matchItem.createEl("div", {
                    cls: "link-maintainer-line-number",
                    text: `Line ${match.lineNumber + 1}:`,
                });
            }

            // Display line content with link
            matchItem.createEl("div", {
                cls: "link-maintainer-line-content",
                text: match.lineContent,
            });
        };

        // Display markdown matches
        if (markdownMatches.length > 0) {
            matchList.createEl("h4", {
                text: `Markdown files (${markdownMatches.length})`,
                cls: "link-maintainer-group-header",
            });
            markdownMatches.forEach((match, index) => {
                createMatchItem(match, index, "Markdown file");
            });
        }

        // Display canvas matches
        if (canvasMatches.length > 0) {
            matchList.createEl("h4", {
                text: `Canvas files (${canvasMatches.length})`,
                cls: "link-maintainer-group-header",
            });
            canvasMatches.forEach((match, index) => {
                createMatchItem(match, index, "Canvas File");
            });
        }

        const buttonContainer = contentEl.createEl("div", {
            cls: "link-maintainer-button-container",
        });

        const cancelButton = buttonContainer.createEl("button", {
            text: "Cancel",
        });
        cancelButton.addEventListener("click", () => {
            self.close();
        });

        const confirmButton = buttonContainer.createEl("button", {
            text: "Update references",
            cls: "mod-cta",
        });
        confirmButton.addEventListener("click", () => {
            self.close();
            self.onConfirm(
                self.matches,
                self.newFileName,
                self.reference,
                self.linkType,
            );
        });
    }

    onClose() {
        const { contentEl } = this;
        const self = this;

        contentEl.empty();
    }
}
