import { App, Plugin, Modal, TextComponent, Notice, DropdownComponent } from 'obsidian';

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
    onSubmit: (oldFileName: string, newFileName: string, reference: string | null, linkType: LinkType) => void;

    constructor(app: App, onSubmit: (oldFileName: string, newFileName: string, reference: string | null, linkType: LinkType) => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.linkType = LinkType.NOTE;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Update Link References" });

        // Link type selector
        contentEl.createEl("label", { text: "Link Type:" });
        const linkTypeDropdown = new DropdownComponent(contentEl);
        linkTypeDropdown
            .addOption(LinkType.NOTE, "Note Link ([[filename]])")
            .addOption(LinkType.BLOCK, "Block Link ([[filename#^blockid]])")
            .addOption(LinkType.HEADING, "Heading Link ([[filename#Heading]])")
            .onChange(value => {
                this.linkType = value as LinkType;
                // Show/hide reference inputs based on link type
                if (blockIdInput && headingInput) {
                    blockIdInput.inputEl.parentElement.style.display = 
                        value === LinkType.BLOCK ? 'block' : 'none';
                    headingInput.inputEl.parentElement.style.display = 
                        value === LinkType.HEADING ? 'block' : 'none';
                }
            });

        contentEl.createEl("br");
        contentEl.createEl("br");

        // Old file name input
        contentEl.createEl("label", { text: "Old File Name:" });
        const oldFileInput = new TextComponent(contentEl)
            .setPlaceholder("Enter old file name (e.g., fooA)")
            .onChange(value => this.oldFileName = value);
        
        contentEl.createEl("br");
        contentEl.createEl("br");

        // New file name input
        contentEl.createEl("label", { text: "New File Name:" });
        const newFileInput = new TextComponent(contentEl)
            .setPlaceholder("Enter new file name (e.g., fooB)")
            .onChange(value => this.newFileName = value);

        contentEl.createEl("br");
        contentEl.createEl("br");

        // Block ID input (only shown for block links)
        contentEl.createEl("label", { text: "Block ID:" });
        const blockIdInput = new TextComponent(contentEl)
            .setPlaceholder("Enter block ID (e.g., bar1234)")
            .onChange(value => this.blockId = value);
        
        // Initially hide block ID input
        blockIdInput.inputEl.parentElement.style.display = 'none';

        contentEl.createEl("br");
        contentEl.createEl("br");

        // Heading input (only shown for heading links)
        contentEl.createEl("label", { text: "Heading:" });
        const headingInput = new TextComponent(contentEl)
            .setPlaceholder("Enter heading text (e.g., Introduction)")
            .onChange(value => this.headingText = value);
        
        // Initially hide heading input
        headingInput.inputEl.parentElement.style.display = 'none';

        contentEl.createEl("br");
        contentEl.createEl("br");

        // Search button
        const searchButton = contentEl.createEl("button", { text: "Search" });
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
    onConfirm: (matches: LinkMatch[], newFileName: string, reference: string | null) => void;

    constructor(
        app: App, 
        matches: LinkMatch[], 
        newFileName: string,
        reference: string | null,
        linkType: LinkType,
        onConfirm: (matches: LinkMatch[], newFileName: string, reference: string | null) => void
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
            this.onConfirm(this.matches, this.newFileName, this.reference);
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export default class BlockLinkUpdater extends Plugin {
    async onload() {
        this.addCommand({
            id: 'update-links',
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

        for (const file of files) {
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');
            
            lines.forEach((line, index) => {
                let pattern: string;
                switch (linkType) {
                    case LinkType.BLOCK:
                        // Search for block links in the format [[oldFileName#^blockId]]
                        pattern = `\\[\\[${oldFileName}#\\^${reference}\\]\\]`;
                        break;
                    case LinkType.HEADING:
                        // Search for heading links in the format [[oldFileName#Heading]]
                        pattern = `\\[\\[${oldFileName}#${reference}\\]\\]`;
                        break;
                    default:
                        // Search for note links in the format [[oldFileName]]
                        pattern = `\\[\\[${oldFileName}\\]\\]`;
                }

                if (new RegExp(pattern).test(line)) {
                    matches.push({
                        file: file.path,
                        lineContent: line,
                        lineNumber: index + 1,
                        linkText: line.match(new RegExp(pattern))?.[0] || ''
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
            (matches, newFileName, reference) => {
                this.replaceLinks(matches, newFileName, reference, linkType);
            }
        ).open();
    }

    async replaceLinks(matches: LinkMatch[], newFileName: string, reference: string | null, linkType: LinkType) {
        for (const match of matches) {
            const file = this.app.vault.getAbstractFileByPath(match.file);
            if (!file || !(file instanceof this.app.vault.adapter.constructor)) continue;

            const content = await this.app.vault.read(file as any);
            let oldPattern: string;
            let newLink: string;

            switch (linkType) {
                case LinkType.BLOCK:
                    oldPattern = `\\[\\[.*?#\\^${reference}\\]\\]`;
                    newLink = `[[${newFileName}#^${reference}]]`;
                    break;
                case LinkType.HEADING:
                    oldPattern = `\\[\\[.*?#${reference}\\]\\]`;
                    newLink = `[[${newFileName}#${reference}]]`;
                    break;
                default:
                    oldPattern = `\\[\\[${match.linkText.slice(2, -2)}\\]\\]`;
                    newLink = `[[${newFileName}]]`;
            }

            const newContent = content.replace(
                new RegExp(oldPattern, 'g'),
                newLink
            );

            await this.app.vault.modify(file as any, newContent);
        }

        new Notice(`Updated ${matches.length} link(s)`);
    }
}
