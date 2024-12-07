import { App, Modal, Notice, TextComponent } from 'obsidian';
import { LinkType } from './types';

export class SearchModal extends Modal {
    oldFileName: string = '';
    newFileName: string = '';
    blockId: string | null = null;
    headingText: string | null = null;
    linkType: LinkType = LinkType.NOTE;
    onSubmit: (oldFileName: string, newFileName: string, reference: string | null, linkType: LinkType) => void;

    constructor(app: App, onSubmit: (oldFileName: string, newFileName: string, reference: string | null, linkType: LinkType) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('link-maintainer-modal');
        contentEl.createEl("h2", { text: "Link Maintainer: Update Link References" });

        // Link type dropdown
        const linkTypeContainer = contentEl.createDiv({ cls: 'setting-item' });
        linkTypeContainer.createEl("label", { text: "Link Type:" });
        const linkTypeDropdown = linkTypeContainer.createEl("select");
        linkTypeDropdown.createEl("option", { text: "Note Link ([[filename]])", value: LinkType.NOTE });
        linkTypeDropdown.createEl("option", { text: "Block Link ([[filename#^blockid]])", value: LinkType.BLOCK });
        linkTypeDropdown.createEl("option", { text: "Heading Link ([[filename#Heading]])", value: LinkType.HEADING });

        linkTypeDropdown.addEventListener("change", (event: Event) => {
            const selectedValue = (event.target as HTMLSelectElement).value as LinkType;
            this.linkType = selectedValue;
        });

        // Old file name input
        const oldFileContainer = contentEl.createDiv({ cls: 'setting-item' });
        oldFileContainer.createEl("label", { text: "Old File Name:" });
        new TextComponent(oldFileContainer)
            .setPlaceholder("Enter old file name (e.g., fooA)")
            .onChange(value => (this.oldFileName = value));

        // New file name input
        const newFileContainer = contentEl.createDiv({ cls: 'setting-item' });
        newFileContainer.createEl("label", { text: "New File Name:" });
        new TextComponent(newFileContainer)
            .setPlaceholder("Enter new file name (e.g., fooB)")
            .onChange(value => (this.newFileName = value));

        // Block ID input (conditionally shown)
        const blockContainer = contentEl.createDiv({ cls: 'setting-item' });
        blockContainer.createEl("label", { text: "Block ID:" });
        const blockInput = new TextComponent(blockContainer)
            .setPlaceholder("Enter block ID (e.g., bar1234)")
            .onChange(value => (this.blockId = value));
        blockContainer.style.display = 'none'; // Hidden by default

        // Heading input (conditionally shown)
        const headingContainer = contentEl.createDiv({ cls: 'setting-item' });
        headingContainer.createEl("label", { text: "Heading:" });
        const headingInput = new TextComponent(headingContainer)
            .setPlaceholder("Enter heading text (e.g., Introduction)")
            .onChange(value => (this.headingText = value));
        headingContainer.style.display = 'none'; // Hidden by default

        // Toggle visibility of Block ID and Heading inputs based on link type
        linkTypeDropdown.addEventListener("change", (event: Event) => {
            const selectedValue = (event.target as HTMLSelectElement).value as LinkType;

            blockContainer.style.display = selectedValue === LinkType.BLOCK ? 'block' : 'none';
            headingContainer.style.display = selectedValue === LinkType.HEADING ? 'block' : 'none';
        });

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
        contentEl.empty(); // Clears modal content when closed
    }
}
