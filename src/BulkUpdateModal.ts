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
            attr: { style: "margin-bottom: 16px;" },
        });
        summary.createSpan({
            text: `Found ${this.allMatches.length} invalid block reference${this.allMatches.length !== 1 ? "s" : ""} to update:`,
        });

        // Group by block ID
        const groupContainer = contentEl.createEl("div", {
            attr: {
                style: "max-height: 400px; overflow-y: auto; margin-bottom: 16px; padding: 12px; border: 1px solid var(--background-modifier-border); border-radius: 4px;",
            },
        });

        for (const plan of this.updatePlan) {
            const groupEl = groupContainer.createEl("div", {
                attr: { style: "margin-bottom: 16px;" },
            });

            // Block ID header
            groupEl.createEl("div", {
                text: `Block ID: ^${plan.blockId} → ${plan.correctFileName}`,
                attr: {
                    style: "font-weight: bold; margin-bottom: 8px; color: var(--text-accent);",
                },
            });

            // List matches for this block ID
            const matchList = groupEl.createEl("div", {
                attr: { style: "margin-left: 16px;" },
            });

            plan.matches.forEach((match, index) => {
                const matchItem = matchList.createEl("div", {
                    attr: {
                        style: "margin-bottom: 8px; font-size: 0.9em; padding: 4px; background: var(--background-secondary); border-radius: 4px;",
                    },
                });

                const file = this.app.vault.getAbstractFileByPath(match.file);
                if (file instanceof TFile) {
                    const fileLink = matchItem.createEl("a", {
                        text: `${index + 1}. ${file.basename}`,
                        cls: "link-maintainer-file-link",
                        attr: {
                            style: "cursor: pointer; color: var(--text-accent);",
                        },
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
                        attr: {
                            style: "font-family: monospace; white-space: pre-wrap; margin-top: 4px; color: var(--text-muted);",
                        },
                    });
                }
            });
        }

        // Warning
        contentEl.createEl("p", {
            text: "This action cannot be automatically undone. Changes will be logged if logging is enabled.",
            attr: {
                style: "color: var(--text-warning); margin-bottom: 16px;",
            },
        });

        // Buttons
        const buttonContainer = contentEl.createEl("div", {
            attr: {
                style: "display: flex; justify-content: flex-end; gap: 8px;",
            },
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
