import { App, Modal } from "obsidian";
import { LinkMatch } from "./types";

export async function showConfirmationDialog(
    app: App,
    matches: LinkMatch[],
    newFileName: string,
): Promise<boolean> {
    return new Promise((resolve) => {
        const modal = new Modal(app);
        modal.titleEl.setText("Confirm Link Updates");

        const content = modal.contentEl;
        content.empty();

        // Group matches by file type
        const markdownMatches = matches.filter((match) => !match.isCanvasNode);
        const canvasMatches = matches.filter((match) => match.isCanvasNode);

        content.createEl("p", {
            text: `You are about to update ${matches.length} block reference${matches.length > 1 ? "s" : ""} to point to "${newFileName}":`,
            attr: { style: "margin-bottom: 12px;" },
        });

        if (matches.length > 0) {
            const list = content.createEl("div", {
                cls: "link-maintainer-changes-list",
                attr: {
                    style: "max-height: 200px; overflow-y: auto; margin-bottom: 12px; padding: 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px;",
                },
            });

            // Function to create match item
            const createMatchItem = (
                match: LinkMatch,
                index: number,
                fileType: string,
            ) => {
                const item = list.createEl("div", {
                    attr: { style: "margin-bottom: 8px; font-size: 0.9em;" },
                });
                item.createEl("div", {
                    text: `${index + 1}. In ${fileType}: ${match.file}${match.isCanvasNode ? " (Node ID: " + match.nodeId + ")" : ""}`,
                    attr: { style: "color: var(--text-muted);" },
                });
                item.createEl("div", {
                    text: match.lineContent,
                    attr: {
                        style: "font-family: monospace; white-space: pre-wrap; margin-top: 4px;",
                    },
                });
            };

            // Display markdown matches
            if (markdownMatches.length > 0) {
                list.createEl("div", {
                    text: `Markdown Files (${markdownMatches.length})`,
                    attr: { style: "font-weight: bold; margin: 8px 0;" },
                });
                markdownMatches.forEach((match, index) => {
                    createMatchItem(match, index, "Markdown File");
                });
            }

            // Display canvas matches
            if (canvasMatches.length > 0) {
                list.createEl("div", {
                    text: `Canvas Files (${canvasMatches.length})`,
                    attr: {
                        style: "font-weight: bold; margin: 8px 0; margin-top: 16px;",
                    },
                });
                canvasMatches.forEach((match, index) => {
                    createMatchItem(match, index, "Canvas File");
                });
            }
        }

        const warningEl = content.createEl("p", {
            cls: "link-maintainer-warning",
            text: "This action cannot be automatically undone. Changes will be logged if logging is enabled.",
            attr: { style: "color: var(--text-warning); margin-bottom: 12px;" },
        });

        // Buttons container
        const buttonContainer = content.createEl("div", {
            attr: {
                style: "display: flex; justify-content: flex-end; gap: 8px;",
            },
        });

        // Cancel button
        buttonContainer.createEl("button", {
            text: "Cancel",
            attr: { style: "padding: 4px 12px;" },
        }).onclick = () => {
            modal.close();
            resolve(false);
        };

        // Confirm button
        const confirmButton = buttonContainer.createEl("button", {
            cls: "mod-cta",
            text: "Confirm Updates",
            attr: { style: "padding: 4px 12px;" },
        });
        confirmButton.onclick = () => {
            modal.close();
            resolve(true);
        };

        modal.open();
    });
}
