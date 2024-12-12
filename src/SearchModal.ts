import { App, Modal, Notice, TextComponent } from "obsidian";
import { LinkType } from "./types";

export class SearchModal extends Modal {
    oldFileName: string;
    newFileName: string;
    blockId: string | null = null;
    headingText: string | null = null;
    linkType: LinkType;
    onSubmit: (
        oldFileName: string,
        newFileName: string,
        reference: string | null,
        linkType: LinkType,
    ) => void;

    constructor(
        app: App,
        onSubmit: (
            oldFileName: string,
            newFileName: string,
            reference: string | null,
            linkType: LinkType,
        ) => void,
    ) {
        super(app);
        this.onSubmit = onSubmit;
        this.linkType = LinkType.NOTE; // Default link type
    }

    onOpen() {
        const { contentEl } = this;
        const self = this;
        contentEl.addClass("link-maintainer-modal");
        contentEl.createEl("h2", {
            text: "Link Maintainer: Update link references",
        });

        // Link type dropdown
        const linkTypeContainer = contentEl.createDiv({ cls: "setting-item" });
        linkTypeContainer.createEl("label", { text: "Link type:" });
        const linkTypeDropdown = linkTypeContainer.createEl("select");
        linkTypeDropdown.createEl("option", {
            text: "Note link ([[filename]])",
            value: LinkType.NOTE,
        });
        linkTypeDropdown.createEl("option", {
            text: "Block link ([[filename#^blockid]])",
            value: LinkType.BLOCK,
        });
        linkTypeDropdown.createEl("option", {
            text: "Heading link ([[filename#Heading]])",
            value: LinkType.HEADING,
        });

        linkTypeDropdown.addEventListener("change", (event: Event) => {
            const selectedValue = (event.target as HTMLSelectElement)
                .value as LinkType;
            self.linkType = selectedValue;
        });

        // Old file name input
        const oldFileContainer = contentEl.createDiv({ cls: "setting-item" });
        oldFileContainer.createEl("label", { text: "Old file name:" });
        new TextComponent(oldFileContainer)
            .setPlaceholder("Enter old file name (e.g., fooA)")
            .onChange((value) => (self.oldFileName = value));

        // New file name input
        const newFileContainer = contentEl.createDiv({ cls: "setting-item" });
        newFileContainer.createEl("label", { text: "New file name:" });
        new TextComponent(newFileContainer)
            .setPlaceholder("Enter new file name (e.g., fooB)")
            .onChange((value) => (self.newFileName = value));

        // Block ID input (conditionally shown)
        const blockContainer = contentEl.createDiv({
            cls: "setting-item block-container",
        });
        blockContainer.createEl("label", { text: "Block ID:" });
        const blockInput = new TextComponent(blockContainer)
            .setPlaceholder("Enter block ID (e.g., bar1234)")
            .onChange((value) => (self.blockId = value));
        blockContainer.toggleClass("active", false);

        // Heading input (conditionally shown)
        const headingContainer = contentEl.createDiv({
            cls: "setting-item heading-container",
        });
        headingContainer.createEl("label", { text: "Heading:" });
        const headingInput = new TextComponent(headingContainer)
            .setPlaceholder("Enter heading text (e.g., Introduction)")
            .onChange((value) => (self.headingText = value));
        headingContainer.toggleClass("active", false);

        // Toggle visibility of Block ID and Heading inputs based on link type
        linkTypeDropdown.addEventListener("change", (event: Event) => {
            const selectedValue = (event.target as HTMLSelectElement)
                .value as LinkType;

            blockContainer.toggleClass(
                "active",
                selectedValue === LinkType.BLOCK,
            );
            headingContainer.toggleClass(
                "active",
                selectedValue === LinkType.HEADING,
            );
        });

        // Search button
        const buttonContainer = contentEl.createDiv({ cls: "setting-item" });
        const searchButton = buttonContainer.createEl("button", {
            text: "Search",
        });
        searchButton.addEventListener("click", () => {
            if (!self.oldFileName || !self.newFileName) {
                new Notice("Please enter both file names");
                return;
            }

            let reference: string | null = null;
            switch (self.linkType) {
                case LinkType.BLOCK:
                    if (!self.blockId) {
                        new Notice("Please enter a block ID");
                        return;
                    }
                    reference = self.blockId;
                    break;
                case LinkType.HEADING:
                    if (!self.headingText) {
                        new Notice("Please enter a heading");
                        return;
                    }
                    reference = self.headingText;
                    break;
            }

            self.onSubmit(
                self.oldFileName,
                self.newFileName,
                reference,
                self.linkType,
            );
            self.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        const self = this;

        contentEl.empty(); // Clears modal content when closed
    }
}
