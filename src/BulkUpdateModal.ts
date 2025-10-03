import { App, Modal, TFile, MarkdownView } from "obsidian";
import { LinkMatch } from "./types";

export class BulkUpdateModal extends Modal {
    constructor(
        app: App,
        private allMatches: LinkMatch[],
        private updatePlan: Array<{
            matches: LinkMatch[];
            correctFileName: string;
            blockId: string;
        }>,
        private onConfirm: () => Promise<void>,
    ) {
        super(app);
    }

    onOpen(): void {
        const { contentEl } = this;

        contentEl.empty();
        contentEl.addClass("link-maintainer-modal");

        // Title
        contentEl.createEl("h2", {
            text: "Confirm bulk block reference updates",
        });

        // Summary
        const summary = contentEl.createEl("p", {
            cls: "bulk-update-summary",
        });
        summary.createSpan({
            text: `Found ${this.allMatches.length} invalid block reference${this.allMatches.length !== 1 ? "s" : ""} to update:`,
        });

        // Group by block ID
        const groupContainer = contentEl.createEl("div", {
            cls: "bulk-update-group-container",
        });

        for (const plan of this.updatePlan) {
            const groupEl = groupContainer.createEl("div", {
                cls: "bulk-update-group",
            });

            // Block ID header
            groupEl.createEl("div", {
                text: `Block ID: ^${plan.blockId} → ${plan.correctFileName}`,
                cls: "bulk-update-block-header",
            });

            // List matches for this block ID
            const matchList = groupEl.createEl("div", {
                cls: "bulk-update-match-list",
            });

            plan.matches.forEach((match, index) => {
                const matchItem = matchList.createEl("div", {
                    cls: "bulk-update-match-item",
                });

                const file = this.app.vault.getAbstractFileByPath(match.file);
                if (file instanceof TFile) {
                    const fileLink = matchItem.createEl("a", {
                        text: `${index + 1}. ${file.basename}`,
                        cls: "link-maintainer-file-link",
                    });
                    fileLink.addEventListener("click", async () => {
                        const leaf = this.app.workspace.getLeaf();
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
                        this.close();
                    });

                    matchItem.createEl("div", {
                        text: match.lineContent,
                        cls: "bulk-update-match-content",
                    });
                }
            });
        }

        // Warning
        contentEl.createEl("p", {
            text: "This action cannot be automatically undone. Changes will be logged if logging is enabled.",
            cls: "bulk-update-warning",
        });

        // Buttons
        const buttonContainer = contentEl.createEl("div", {
            cls: "link-maintainer-button-container",
        });

        const cancelButton = buttonContainer.createEl("button", {
            text: "Cancel",
        });
        cancelButton.addEventListener("click", () => {
            this.close();
        });

        const confirmButton = buttonContainer.createEl("button", {
            text: "Update all references",
            cls: "mod-cta",
        });
        confirmButton.addEventListener("click", async () => {
            this.close();
            await this.onConfirm();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
