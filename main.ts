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
    private searchQuery: string = '';
    private selectedLink: string | null = null;
    private newFileName: string = '';
    private linkType: LinkType = LinkType.NOTE;
    private suggestions: string[] = [];
    private fileNames: string[] = [];
    private onSubmit: (oldFileName: string, newFileName: string, reference: string | null, linkType: LinkType) => void;

    constructor(app: App, onSubmit: (oldFileName: string, newFileName: string, reference: string | null, linkType: LinkType) => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.fileNames = this.app.vault.getMarkdownFiles().map(file => file.basename);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('link-maintainer-modal');
        contentEl.createEl("h2", { text: "Update Link References" });

        // Step 1: Search for existing links
        const searchContainer = contentEl.createDiv({ cls: 'setting-item' });
        searchContainer.createEl("label", { text: "Search for links:" });
        const searchInput = new TextComponent(searchContainer)
            .setPlaceholder("Start typing to search for links...")
            .onChange(async (value) => {
                this.searchQuery = value;
                await this.updateSuggestions();
            });

        // Suggestions container
        const suggestionsContainer = contentEl.createDiv({ cls: 'suggestions-container' });

        // Step 2: Link modification (initially hidden)
        const modificationContainer = contentEl.createDiv({ cls: 'modification-container' });
        modificationContainer.style.display = 'none';

        // Preview section
        const previewContainer = contentEl.createDiv({ cls: 'preview-container' });
        previewContainer.createEl("h3", { text: "Preview" });
        const previewContent = previewContainer.createDiv({ cls: 'preview-content' });
    }

    private async updateSuggestions() {
        const matches: LinkMatch[] = [];
        const files = this.app.vault.getMarkdownFiles();

        for (const file of files) {
            const content = await this.app.vault.read(file);
            const linkRegex = /\[\[([^\]]+)\]\]/g;
            let match;

            while ((match = linkRegex.exec(content)) !== null) {
                if (match[1].toLowerCase().includes(this.searchQuery.toLowerCase())) {
                    matches.push({
                        file: file.path,
                        lineContent: match[0],
                        lineNumber: content.substring(0, match.index).split('\n').length,
                        linkText: match[0]
                    });
                }
            }
        }

        this.updateSuggestionsUI(matches);
    }

    private updateSuggestionsUI(matches: LinkMatch[]) {
        const suggestionsContainer = this.contentEl.querySelector('.suggestions-container');
        if (!suggestionsContainer) return;

        suggestionsContainer.empty();
        
        if (matches.length === 0) {
            suggestionsContainer.createEl("div", { text: "No matches found" });
            return;
        }

        const list = suggestionsContainer.createEl("ul", { cls: "suggestions-list" });
        matches.forEach(match => {
            const item = list.createEl("li");
            item.createEl("span", { text: match.linkText, cls: "suggestion-link" });
            item.createEl("span", { text: ` in ${match.file}`, cls: "suggestion-file" });
            
            item.addEventListener("click", () => {
                this.selectedLink = match.linkText;
                this.showModificationOptions(match);
            });
        });
    }

    private showModificationOptions(match: LinkMatch) {
        const modificationContainer = this.contentEl.querySelector('.modification-container');
        if (!modificationContainer) return;

        modificationContainer.empty();
        modificationContainer.style.display = 'block';

        // Extract link details
        const linkParts = match.linkText.match(/\[\[([^#\]]+)(?:#\^?([^\]]+))?\]\]/);
        if (!linkParts) return;

        const [_, rawOldFileName, reference] = linkParts;
        const oldFileName = rawOldFileName.trim();
        
        // Determine link type and show appropriate options
        if (reference) {
            this.linkType = reference.startsWith('^') ? LinkType.BLOCK : LinkType.HEADING;
        } else {
            this.linkType = LinkType.NOTE;
        }

        // New file name input with suggestions
        const newFileContainer = modificationContainer.createDiv({ cls: 'setting-item' });
        newFileContainer.createEl("label", { text: "New File Name:" });
        const newFileInput = new TextComponent(newFileContainer)
            .setPlaceholder("Enter new file name")
            .setValue(oldFileName)
            .onChange(value => {
                this.newFileName = value.trim();
                this.updatePreview(match);
            });

        // Add file suggestions
        const suggestions = this.fileNames.filter(name => 
            name.toLowerCase().includes(this.newFileName.toLowerCase())
        );

        if (suggestions.length > 0) {
            const suggestionsList = newFileContainer.createEl("ul", { cls: "file-suggestions" });
            suggestions.forEach(suggestion => {
                const item = suggestionsList.createEl("li");
                item.setText(suggestion);
                item.addEventListener("click", () => {
                    newFileInput.setValue(suggestion);
                    this.newFileName = suggestion.trim();
                    this.updatePreview(match);
                });
            });
        }

        // Add confirmation button
        const buttonContainer = modificationContainer.createDiv({ cls: 'setting-item' });
        const confirmButton = buttonContainer.createEl("button", { text: "Update Links" });
        confirmButton.addEventListener("click", () => {
            if (!this.newFileName) {
                new Notice("Please enter a new file name");
                return;
            }

            this.onSubmit(oldFileName.trim(), this.newFileName.trim(), reference?.trim() || null, this.linkType);
            this.close();
        });
    }

    private updatePreview(match: LinkMatch) {
        const previewContent = this.contentEl.querySelector('.preview-content');
        if (!previewContent) return;

        previewContent.empty();
        
        const oldLink = previewContent.createDiv({ cls: 'preview-old' });
        oldLink.createEl("strong", { text: "Old: " });
        oldLink.createSpan({ text: match.linkText });

        const newLink = previewContent.createDiv({ cls: 'preview-new' });
        newLink.createEl("strong", { text: "New: " });
        
        let newLinkText = `[[${this.newFileName}`;
        if (this.linkType === LinkType.BLOCK) {
            newLinkText += `#^${match.linkText.match(/#\^([^\]]+)/)?.[1] || ''}`;
        } else if (this.linkType === LinkType.HEADING) {
            newLinkText += `#${match.linkText.match(/#([^\]]+)/)?.[1] || ''}`;
        }
        newLinkText += ']]';
        
        newLink.createSpan({ text: newLinkText });
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
        const escapedOldFileName = oldFileName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedReference = reference ? reference.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';

        let pattern: string;
        switch (linkType) {
            case LinkType.BLOCK:
                pattern = `(!?\\[\\[)\\s*${escapedOldFileName}\\s*#\\^${escapedReference}(\\|[^\\]]+)?\\]\\]`;
                break;
            case LinkType.HEADING:
                pattern = `(!?\\[\\[)\\s*${escapedOldFileName}\\s*#${escapedReference}(\\|[^\\]]+)?\\]\\]`;
                break;
            default:
                pattern = `(!?\\[\\[)\\s*${escapedOldFileName}\\s*(\\|[^\\]]+)?\\]\\]`;
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

        // Show results modal with trimmed values
        new ResultsModal(
            this.app, 
            matches, 
            newFileName.trim(),
            reference?.trim() || null,
            linkType,
            (matches, newFileName, reference, linkType) => {
                this.replaceLinks(matches, newFileName.trim(), reference?.trim() || null, linkType);
            }
        ).open();
    }

    async replaceLinks(matches: LinkMatch[], newFileName: string, reference: string | null, linkType: LinkType) {
        // Extract the old file name from the first match
        const oldFileNameMatch = matches[0].linkText.match(/\[\[!?([^\#\|\]]+)/);
        if (!oldFileNameMatch) {
            new Notice("Failed to extract old file name from link.");
            return;
        }
        const oldFileName = oldFileNameMatch[1].trim();

        for (const match of matches) {
            const file = this.app.vault.getAbstractFileByPath(match.file);
            if (!file || !(file instanceof TFile)) continue;

            const content = await this.app.vault.read(file);

            // Create a regex that matches the exact link text
            const escapedLinkText = match.linkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedLinkText, 'g');

            let newLinkText = '';
            switch (linkType) {
                case LinkType.BLOCK:
                    newLinkText = `[[${newFileName}#^${reference}]]`;
                    break;
                case LinkType.HEADING:
                    newLinkText = `[[${newFileName}#${reference}]]`;
                    break;
                default:
                    newLinkText = `[[${newFileName}]]`;
            }

            const newContent = content.replace(regex, newLinkText);

            if (content !== newContent) {
                await this.app.vault.modify(file, newContent);
            }
        }

        new Notice(`Updated ${matches.length} link(s)`);
    }
}
