import { App, Plugin, Modal, TextComponent, Notice, DropdownComponent, TFile } from 'obsidian';

interface LinkMatch {
    file: string;
    lineContent: string;
    lineNumber: number;
    linkText: string;
}

enum LinkType {
    NOTE = 'note',
    BLOCK = 'block',
    HEADING = 'heading'
}

class SearchModal extends Modal {
    oldFileName: string;
    newFileName: string;
    blockId: string;
    headingText: string;
    linkType: LinkType;
    blockIdInput: TextComponent;
    headingInput: TextComponent;
    onSubmit: (oldFileName: string, newFileName: string, reference: string | null, linkType: LinkType) => void;

    constructor(app: App, onSubmit: (oldFileName: string, newFileName: string, reference: string | null, linkType: LinkType) => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.linkType = LinkType.NOTE;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('link-maintainer-modal');
        contentEl.createEl("h2", { text: "Update Link References" });

        // Link type selector
        const dropdownContainer = contentEl.createDiv({ cls: 'dropdown' });
        dropdownContainer.createEl("label", { text: "Link Type:" });
        const dropdownComponentContainer = dropdownContainer.createDiv({ cls: 'dropdown-component' });
        const linkTypeDropdown = new DropdownComponent(dropdownComponentContainer)
            .addOption(LinkType.NOTE, "Note Link ([[filename]])")
            .addOption(LinkType.BLOCK, "Block Link ([[filename#^blockid]])")
            .addOption(LinkType.HEADING, "Heading Link ([[filename#Heading]])")
            .onChange(value => {
                this.linkType = value as LinkType;
                // Show/hide reference inputs based on link type
                if (this.blockIdInput && this.headingInput) {
                    this.blockIdInput.inputEl.parentElement.parentElement.style.display = 
                        value === LinkType.BLOCK ? 'block' : 'none';
                    this.headingInput.inputEl.parentElement.parentElement.style.display = 
                        value === LinkType.HEADING ? 'block' : 'none';
                }
            });

        // Old file name input
        const oldFileContainer = contentEl.createDiv({ cls: 'setting-item' });
        oldFileContainer.createEl("label", { text: "Old File Name:" });
        const oldFileInputContainer = oldFileContainer.createDiv();
        const oldFileInput = new TextComponent(oldFileInputContainer)
            .setPlaceholder("Enter old file name (e.g., fooA)")
            .onChange(value => this.oldFileName = value);
        
        // New file name input
        const newFileContainer = contentEl.createDiv({ cls: 'setting-item' });
        newFileContainer.createEl("label", { text: "New File Name:" });
        const newFileInputContainer = newFileContainer.createDiv();
        const newFileInput = new TextComponent(newFileInputContainer)
            .setPlaceholder("Enter new file name (e.g., fooB)")
            .onChange(value => this.newFileName = value);

        // Block ID input (only shown for block links)
        const blockContainer = contentEl.createDiv({ cls: 'setting-item' });
        blockContainer.createEl("label", { text: "Block ID:" });
        const blockInputContainer = blockContainer.createDiv();
        this.blockIdInput = new TextComponent(blockInputContainer)
            .setPlaceholder("Enter block ID (e.g., bar1234)")
            .onChange(value => this.blockId = value);
        blockContainer.style.display = 'none';

        // Heading input (only shown for heading links)
        const headingContainer = contentEl.createDiv({ cls: 'setting-item' });
        headingContainer.createEl("label", { text: "Heading:" });
        const headingInputContainer = headingContainer.createDiv();
        this.headingInput = new TextComponent(headingInputContainer)
            .setPlaceholder("Enter heading text (e.g., Introduction)")
            .onChange(value => this.headingText = value);
        headingContainer.style.display = 'none';

        // Search button
        const buttonContainer = contentEl.createDiv({ cls: 'setting-item' });
        const searchButton = buttonContainer.createEl("button", { text: "Search" });
        searchButton.addEventListener("click", () => {
            if (!this.oldFileName || !this.newFileName) {
                new Notice("Please enter both file names");
                return;
            }

            let reference: string | null = null;
            switch (this.linkType) {
                case LinkType.BLOCK:
                    if (!this.blockId) {
                        new Notice("Please enter a block ID");
                        return;
                    }
                    reference = this.blockId;
                    break;
                case LinkType.HEADING:
                    if (!this.headingText) {
                        new Notice("Please enter a heading");
                        return;
                    }
                    reference = this.headingText;
                    break;
            }

            this.onSubmit(this.oldFileName, this.newFileName, reference, this.linkType);
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class ResultsModal extends Modal {
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
        contentEl.createEl("h2", { text: "Found Links" });

        if (this.matches.length === 0) {
            contentEl.createEl("p", { text: "No matches found." });
            return;
        }

        // Display matches
        const matchList = contentEl.createEl("div");
        this.matches.forEach(match => {
            const matchEl = matchList.createEl("div", { cls: "link-match" });
            let newLink: string;
            
            switch (this.linkType) {
                case LinkType.BLOCK:
                    newLink = `[[${this.newFileName}#^${this.reference}]]`;
                    break;
                case LinkType.HEADING:
                    newLink = `[[${this.newFileName}#${this.reference}]]`;
                    break;
                default:
                    newLink = `[[${this.newFileName}]]`;
            }
            
            matchEl.createEl("p", { 
                text: `File: ${match.file}\nLine ${match.lineNumber}: ${match.lineContent}\nWill be replaced with: ${newLink}` 
            });
        });

        contentEl.createEl("br");

        // Confirm button
        const confirmButton = contentEl.createEl("button", { text: "Confirm Replacement" });
        confirmButton.addEventListener("click", () => {
            this.onConfirm(this.matches, this.newFileName, this.reference, this.linkType);
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export default class LinkMaintainer extends Plugin {
    async onload() {
        this.addCommand({
            id: 'link-maintainer-update-references',
            name: 'Update Link References',
            callback: () => this.showSearchModal(),
        });
    }

    showSearchModal() {
        new SearchModal(
            this.app, 
            (oldFileName: string, newFileName: string, reference: string | null, linkType: LinkType) => {
                this.searchLinks(oldFileName, newFileName, reference, linkType);
            }
        ).open();
    }

    async searchLinks(oldFileName: string, newFileName: string, reference: string | null, linkType: LinkType) {
        const matches: LinkMatch[] = [];
        const files = this.app.vault.getMarkdownFiles();

        // Escape special regex characters in the file name but keep spaces
        const escapedOldFileName = oldFileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedReference = reference ? reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';

        let pattern: string;
        switch (linkType) {
            case LinkType.BLOCK:
                pattern = `(!?\\[\\[)${escapedOldFileName}\\s*#\\^${escapedReference}(\\|[^\\]]+)?\\]\\]`;
                break;
            case LinkType.HEADING:
                pattern = `(!?\\[\\[)${escapedOldFileName}\\s*#${escapedReference}(\\|[^\\]]+)?\\]\\]`;
                break;
            default:
                pattern = `(!?\\[\\[)${escapedOldFileName}(\\|[^\\]]+)?\\]\\]`;
        }

        const regex = new RegExp(pattern, 'g');

        for (const file of files) {
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');

            lines.forEach((line, index) => {
                let match;
                while ((match = regex.exec(line)) !== null) {
                    matches.push({
                        file: file.path,
                        lineContent: line,
                        lineNumber: index + 1,
                        linkText: match[0],
                    });
                }
            });
        }

        // Show results modal
        new ResultsModal(
            this.app, 
            matches, 
            newFileName,
            reference,
            linkType,
            (matches, newFileName, reference, linkType) => {
                this.replaceLinks(matches, newFileName, reference, linkType);
            }
        ).open();
    }

    async replaceLinks(matches: LinkMatch[], newFileName: string, reference: string | null, linkType: LinkType) {
        // Extract the old file name from the first match
        const oldFileNameMatch = matches[0].linkText.match(/^\[\[!?([^\#\|\]]+)/);
        if (!oldFileNameMatch) {
            new Notice("Failed to extract old file name from link.");
            return;
        }
        const escapedOldFileName = oldFileNameMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        for (const match of matches) {
            const file = this.app.vault.getAbstractFileByPath(match.file);
            if (!file || !(file instanceof TFile)) continue;

            const content = await this.app.vault.read(file);

            let pattern: string;
            switch (linkType) {
                case LinkType.BLOCK:
                    pattern = `(!?\\[\\[)${escapedOldFileName}\\s*#\\^${reference}(\\|[^\\]]+)?\\]\\]`;
                    break;
                case LinkType.HEADING:
                    pattern = `(!?\\[\\[)${escapedOldFileName}\\s*#${escapedReference}(\\|[^\\]]+)?\\]\\]`;
                    break;
                default:
                    pattern = `(!?\\[\\[)${escapedOldFileName}(\\|[^\\]]+)?\\]\\]`;
            }

            const regex = new RegExp(pattern, 'g');

            const newContent = content.replace(regex, (fullMatch, p1, p2, p3) => {
                const alias = p3 || '';
                let updatedLink = '';
                switch (linkType) {
                    case LinkType.BLOCK:
                        updatedLink = `${p1}${newFileName}#^${reference}${alias}]]`;
                        break;
                    case LinkType.HEADING:
                        updatedLink = `${p1}${newFileName}#${reference}${alias}]]`;
                        break;
                    default:
                        updatedLink = `${p1}${newFileName}${alias}]]`;
                }
                return updatedLink;
            });

            if (content !== newContent) {
                await this.app.vault.modify(file, newContent);
            }
        }

        new Notice(`Updated ${matches.length} link(s)`);
    }
}
