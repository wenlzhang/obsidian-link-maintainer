import { Modal, App, TFile } from "obsidian";
import { LinkMatch, LinkType } from "./main";

export class ResultsModal extends Modal {
    matches: LinkMatch[];
    newFileName: string;
    reference: string | null;
    linkType: LinkType;
    onConfirm: (matches: LinkMatch[], newFileName: string, reference: string | null, linkType: LinkType) => void;

    constructor(
        app: App,
        matches: LinkMatch[],
        newFileName: string,
        reference: string | null,
        linkType: LinkType,
        onConfirm: (matches: LinkMatch[], newFileName: string, reference: string | null, linkType: LinkType) => void
    ) {
        super(app);
        this.matches = matches;
        this.newFileName = newFileName;
        this.reference = reference;
        this.linkType = linkType;
        this.onConfirm = onConfirm;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('link-maintainer-modal');

        contentEl.createEl('h2', { text: 'Link Maintainer: Update block references' });

        // Display basic information
        const infoContainer = contentEl.createEl('div', { cls: 'link-maintainer-info' });

        // Block ID
        infoContainer.createEl('div', {
            cls: 'link-maintainer-info-item',
            text: `Block ID: ^${this.reference}`
        });

        // Get the old file name from the first match
        const oldFileName = this.matches[0]?.oldFileName || '';
        if (oldFileName) {
            infoContainer.createEl('div', {
                cls: 'link-maintainer-info-item',
                text: `Old file name: ${oldFileName}`
            });
        }

        // New file name
        infoContainer.createEl('div', {
            cls: 'link-maintainer-info-item',
            text: `New file name: ${this.newFileName}`
        });

        // Match list title
        contentEl.createEl('h3', { text: 'Found References:' });

        const matchList = contentEl.createEl('div', { cls: 'link-maintainer-match-list' });

        this.matches.forEach((match, index) => {
            const matchItem = matchList.createEl('div', { cls: 'link-maintainer-match-item' });

            // Create file link area
            const fileInfoContainer = matchItem.createEl('div', { cls: 'link-maintainer-file-info' });

            // Display file number
            fileInfoContainer.createSpan({
                text: `File ${index + 1}: `
            });

            // Create clickable file link
            const file = this.app.vault.getAbstractFileByPath(match.file);
            if (file instanceof TFile) {
                const fileName = file.basename;
                const fileLink = fileInfoContainer.createEl('a', {
                    text: `[[${fileName}]]`,
                    cls: 'link-maintainer-file-link'
                });
                fileLink.addEventListener('click', async (event) => {
                    // Open file and jump to specified line
                    const leaf = this.app.workspace.getLeaf();
                    await leaf.openFile(file);
                    const view = leaf.view;
                    if (view.editor) {
                        const pos = { line: match.lineNumber, ch: 0 };
                        view.editor.setCursor(pos);
                        view.editor.scrollIntoView({ from: pos, to: pos }, true);
                    }
                });
            }

            // Display line number
            matchItem.createEl('div', {
                cls: 'link-maintainer-line-number',
                text: `Line ${match.lineNumber + 1}:`
            });

            // Display line content with link
            matchItem.createEl('div', {
                cls: 'link-maintainer-line-content',
                text: match.lineContent
            });
        });

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .link-maintainer-modal {
                padding: 20px;
            }
            .link-maintainer-info {
                margin-bottom: 20px;
                padding: 10px;
                background-color: var(--background-secondary);
                border-radius: 5px;
            }
            .link-maintainer-info-item {
                margin: 5px 0;
                font-family: var(--font-monospace);
            }
            .link-maintainer-match-list {
                margin-top: 10px;
            }
            .link-maintainer-match-item {
                margin: 20px 0;
            }
            .link-maintainer-file-info {
                font-weight: bold;
                margin-bottom: 5px;
            }
            .link-maintainer-file-link {
                color: var(--text-accent);
                text-decoration: none;
                cursor: pointer;
            }
            .link-maintainer-file-link:hover {
                text-decoration: underline;
            }
            .link-maintainer-line-number {
                margin: 5px 0;
                color: var(--text-muted);
            }
            .link-maintainer-line-content {
                font-family: var(--font-monospace);
                padding: 5px;
                background-color: var(--background-secondary);
                border-radius: 3px;
                white-space: pre-wrap;
            }
            .link-maintainer-button-container {
                margin-top: 20px;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
        `;
        document.head.appendChild(style);

        const buttonContainer = contentEl.createEl('div', { cls: 'link-maintainer-button-container' });

        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel'
        });
        cancelButton.addEventListener('click', () => {
            this.close();
        });

        const confirmButton = buttonContainer.createEl('button', {
            text: 'Update References',
            cls: 'mod-cta'
        });
        confirmButton.addEventListener('click', () => {
            this.close();
            this.onConfirm(this.matches, this.newFileName, this.reference, this.linkType);
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
