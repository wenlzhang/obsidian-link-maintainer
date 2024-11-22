import { App, Plugin, Modal, TextComponent, Notice, DropdownComponent, TFile, PluginSettingTab, Setting } from 'obsidian';

interface LinkMatch {
    file: string;
    lineContent: string;
    lineNumber: number;
    linkText: string;
    oldFileName?: string;
}

interface ExtractedInfo {
    blockId: string;
    fileName: string;
}

enum LinkType {
    NOTE = 'note',
    BLOCK = 'block',
    HEADING = 'heading'
}

interface LinkMaintainerSettings {
    replaceExistingBlockLinks: boolean;
    enableChangeLogging: boolean;
    logFilePath: string;
    showConfirmationDialog: boolean;
}

interface LinkChangeLog {
    timestamp: string;
    originalFile: string;
    lineNumber: number;
    originalContent: string;
    newContent: string;
    blockId: string;
    oldFileName: string | null;
    newFileName: string;
}

interface BatchChangeLog {
    timestamp: string;
    blockId: string;
    newFileName: string;
    description: string;
    changes: LinkChangeLog[];
}

const DEFAULT_SETTINGS: LinkMaintainerSettings = {
    replaceExistingBlockLinks: false,
    enableChangeLogging: true,
    logFilePath: 'link-maintainer-changes.md',
    showConfirmationDialog: true
};

function extractBlockInfo(text: string): ExtractedInfo | null {
    // Match complete block reference links [[filename#^blockid]]
    const blockLinkRegex = /\[\[([^\]]+)#\^([^\]\|]+)\]\]/;
    // Match standalone block ID ^blockid
    const blockIdRegex = /\^([^\s\]]+)/;
    
    let match = text.match(blockLinkRegex);
    if (match) {
        return {
            fileName: match[1],
            blockId: match[2]
        };
    }
    
    match = text.match(blockIdRegex);
    if (match) {
        // If only block ID is present, get filename from active file
        const activeFile = app.workspace.getActiveFile();
        if (activeFile) {
            return {
                fileName: activeFile.basename,
                blockId: match[1]
            };
        }
    }
    
    return null;
}

class SearchModal extends Modal {
    oldFileName: string;
    newFileName: string;
    linkType: LinkType;
    onSubmit: (oldFileName: string, newFileName: string, reference: string | null, linkType: LinkType) => void;

    constructor(app: App, onSubmit: (oldFileName: string, newFileName: string, reference: string | null, linkType: LinkType) => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.linkType = LinkType.NOTE; // Default link type
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

class LinkMaintainerSettingTab extends PluginSettingTab {
    plugin: LinkMaintainer;

    constructor(app: App, plugin: LinkMaintainer) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Link Maintainer Settings' });

        // Safety Settings Section
        containerEl.createEl('h3', { 
            text: 'Safety Settings',
            attr: { style: 'margin-top: 24px; margin-bottom: 12px;' }
        });

        // Show confirmation dialog setting
        new Setting(containerEl)
            .setName('Show Confirmation Dialog')
            .setDesc('Show a confirmation dialog before updating block references')
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.showConfirmationDialog)
                    .onChange(async (value) => {
                        this.plugin.settings.showConfirmationDialog = value;
                        await this.plugin.saveSettings();
                    });
            });

        // Enable change logging setting
        new Setting(containerEl)
            .setName('Enable Change Logging')
            .setDesc('Keep a record of all link updates in a log file')
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.enableChangeLogging)
                    .onChange(async (value) => {
                        this.plugin.settings.enableChangeLogging = value;
                        await this.plugin.saveSettings();
                    });
            });

        // Log file path setting
        new Setting(containerEl)
            .setName('Log File Path')
            .setDesc('Path to the log file (relative to vault root)')
            .addText((text) => {
                text
                    .setPlaceholder('link-maintainer-changes.md')
                    .setValue(this.plugin.settings.logFilePath)
                    .onChange(async (value) => {
                        this.plugin.settings.logFilePath = value;
                        await this.plugin.saveSettings();
                    });
            });

        // Link Update Settings Section
        containerEl.createEl('h3', { 
            text: 'Link Update Settings',
            attr: { style: 'margin-top: 24px; margin-bottom: 12px;' }
        });

        // Original replace all block references setting
        new Setting(containerEl)
            .setName('Replace All Block References')
            .setDesc('Controls how block references are updated when moving blocks between notes.')
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.replaceExistingBlockLinks)
                    .onChange(async (value) => {
                        this.plugin.settings.replaceExistingBlockLinks = value;
                        await this.plugin.saveSettings();
                    });
            });

        // Add detailed explanation in a separate container
        const explanationEl = containerEl.createEl('div', {
            cls: 'setting-item-description',
            attr: { style: 'margin-top: 12px; border-left: 2px solid var(--background-modifier-border); padding-left: 12px;' }
        });

        // Behavior explanation
        explanationEl.createEl('div', {
            cls: 'setting-item-heading',
            text: 'Behavior',
            attr: { style: 'margin-bottom: 8px; color: var(--text-muted);' }
        });

        // Off state explanation
        const offEl = explanationEl.createEl('div', {
            attr: { style: 'margin-bottom: 8px;' }
        });
        offEl.createEl('strong', { text: 'When OFF (Default): ' });
        offEl.createSpan({ text: 'Only updates links to blocks that no longer exist in their original location.' });

        // On state explanation
        const onEl = explanationEl.createEl('div', {
            attr: { style: 'margin-bottom: 12px;' }
        });
        onEl.createEl('strong', { text: 'When ON: ' });
        onEl.createSpan({ text: 'Updates all block references, even if the block still exists in its original location.' });

        // Example
        explanationEl.createEl('div', {
            cls: 'setting-item-heading',
            text: 'Example',
            attr: { style: 'margin-bottom: 8px; color: var(--text-muted);' }
        });
        explanationEl.createEl('div', {
            text: 'If you move block ^123 from "note-a" to "note-b", links like [[note-a#^123]] will be updated to [[note-b#^123]].',
            attr: { style: 'font-size: 0.9em; color: var(--text-muted);' }
        });
    }
}

export default class LinkMaintainer extends Plugin {
    settings: LinkMaintainerSettings;
    private currentBatchLog: BatchChangeLog | null = null;

    async logChange(change: LinkChangeLog): Promise<void> {
        if (!this.settings.enableChangeLogging) return;
        
        if (this.currentBatchLog) {
            this.currentBatchLog.changes.push(change);
        }
    }

    private initBatchLog(blockId: string, newFileName: string): void {
        this.currentBatchLog = {
            timestamp: new Date().toISOString(),
            blockId: blockId,
            newFileName: newFileName,
            description: `Block reference update: ^${blockId} → ${newFileName}`,
            changes: []
        };
    }

    private async writeBatchToLog(): Promise<void> {
        if (!this.settings.enableChangeLogging || !this.currentBatchLog) return;

        const logFile = this.app.vault.getAbstractFileByPath(this.settings.logFilePath);
        const batch = this.currentBatchLog;

        const logEntry = [
            `## Batch Update at ${batch.timestamp}`,
            `> ${batch.description}`,
            '',
            '### Details',
            `- **Block ID**: \`^${batch.blockId}\``,
            `- **New Location**: \`${batch.newFileName}\``,
            `- **Files Affected**: ${batch.changes.length}`,
            '',
            '### Changes',
            ...batch.changes.map(change => [
                `#### ${change.originalFile}:${change.lineNumber + 1}`,
                '##### Before:',
                '```',
                change.originalContent,
                '```',
                '##### After:',
                '```',
                change.newContent,
                '```'
            ].join('\n')),
            '\n---\n'
        ].join('\n');

        if (!(logFile instanceof TFile)) {
            // Create log file if it doesn't exist
            await this.app.vault.create(this.settings.logFilePath, logEntry);
        } else {
            // Append to existing log file
            const currentContent = await this.app.vault.read(logFile);
            await this.app.vault.modify(logFile, logEntry + currentContent);
        }

        // Clear the current batch
        this.currentBatchLog = null;
    }

    async showConfirmationDialog(matches: LinkMatch[], newFileName: string): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = new Modal(this.app);
            modal.titleEl.setText('Confirm Link Updates');
            
            const content = modal.contentEl;
            content.empty();
            
            content.createEl('p', {
                text: `You are about to update ${matches.length} block reference${matches.length > 1 ? 's' : ''} to point to "${newFileName}".`,
                attr: { style: 'margin-bottom: 12px;' }
            });

            if (matches.length > 0) {
                const list = content.createEl('div', {
                    cls: 'link-maintainer-changes-list',
                    attr: { style: 'max-height: 200px; overflow-y: auto; margin-bottom: 12px; padding: 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px;' }
                });

                matches.forEach((match, index) => {
                    const item = list.createEl('div', {
                        attr: { style: 'margin-bottom: 8px; font-size: 0.9em;' }
                    });
                    item.createEl('div', {
                        text: `${index + 1}. In file: ${match.file}`,
                        attr: { style: 'color: var(--text-muted);' }
                    });
                    item.createEl('div', {
                        text: match.lineContent,
                        attr: { style: 'font-family: monospace; white-space: pre-wrap; margin-top: 4px;' }
                    });
                });
            }

            const warningEl = content.createEl('p', {
                cls: 'link-maintainer-warning',
                text: 'This action cannot be automatically undone. Changes will be logged if logging is enabled.',
                attr: { style: 'color: var(--text-warning); margin-bottom: 12px;' }
            });

            // Buttons container
            const buttonContainer = content.createEl('div', {
                attr: { style: 'display: flex; justify-content: flex-end; gap: 8px;' }
            });

            // Cancel button
            buttonContainer.createEl('button', {
                text: 'Cancel',
                attr: { style: 'padding: 4px 12px;' }
            }).onclick = () => {
                modal.close();
                resolve(false);
            };

            // Confirm button
            const confirmButton = buttonContainer.createEl('button', {
                cls: 'mod-cta',
                text: 'Confirm Updates',
                attr: { style: 'padding: 4px 12px;' }
            });
            confirmButton.onclick = () => {
                modal.close();
                resolve(true);
            };

            modal.open();
        });
    }

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new LinkMaintainerSettingTab(this.app, this));

        this.addCommand({
            id: 'link-maintainer-update-references',
            name: 'Update link references',
            callback: () => this.showSearchModal(),
        });

        this.addCommand({
            id: 'update-block-references',
            name: 'Update block references from selection',
            editorCallback: (editor) => {
                const selection = editor.getSelection();
                if (!selection) {
                    new Notice('Please select some text first');
                    return;
                }

                const info = extractBlockInfo(selection);
                if (!info) {
                    new Notice('No valid block ID found in selection');
                    return;
                }

                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    new Notice('No active file');
                    return;
                }

                this.searchAndUpdateBlockReferences(info.blockId, activeFile.basename);
            }
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
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
                        lineNumber: index,
                        linkText: match[0],
                    });
                }
            });
        }

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

    async searchAndUpdateBlockReferences(blockId: string, newFileName: string) {
        const matches = await this.searchBlockReferences(blockId, newFileName);
        if (matches.length === 0) {
            new Notice('No references found');
            return;
        }

        new ResultsModal(
            this.app,
            matches,
            newFileName,
            blockId,
            LinkType.BLOCK,
            this.replaceLinks.bind(this)
        ).open();
    }

    async searchBlockReferences(blockId: string, excludeFileName: string): Promise<LinkMatch[]> {
        const matches: LinkMatch[] = [];
        const files = this.app.vault.getMarkdownFiles();
        
        // Create regex pattern to match block ID references
        const blockIdPattern = new RegExp(`\\[\\[([^\\]]+)#\\^${blockId}(?:\\|[^\\]]+)?\\]\\]|\\^${blockId}(?=[\\s\\]\\n]|$)`);
        
        for (const file of files) {
            // Exclude the new file (we don't need to update references in it)
            if (file.basename === excludeFileName) {
                continue;
            }

            const content = await this.app.vault.read(file);
            const lines = content.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Use regex to match complete block ID
                const match = line.match(blockIdPattern);
                if (match) {
                    // Extract filename (if it's a complete link)
                    const linkMatch = line.match(/\[\[([^\]#|]+)/);
                    const oldFileName = linkMatch ? linkMatch[1].trim() : null;

                    if (oldFileName) {
                        // Check if the block exists in the linked file
                        const linkedFile = this.app.vault.getAbstractFileByPath(`${oldFileName}.md`);
                        if (linkedFile instanceof TFile) {
                            const linkedContent = await this.app.vault.read(linkedFile);
                            
                            // If setting is false and the block exists in the linked file, skip it
                            if (!this.settings.replaceExistingBlockLinks && linkedContent.includes(`^${blockId}`)) {
                                continue;
                            }
                        }
                    }
                    
                    matches.push({
                        file: file.path,
                        lineContent: line,
                        lineNumber: i,
                        linkText: line,
                        oldFileName: oldFileName
                    });
                }
            }
        }
        
        return matches;
    }

    async replaceLinks(matches: LinkMatch[], newFileName: string, reference: string | null, linkType: LinkType) {
        // Initialize batch log
        if (reference) {
            this.initBatchLog(reference, newFileName);
        }

        // If confirmation dialog is enabled, show it
        if (this.settings.showConfirmationDialog) {
            const confirmed = await this.showConfirmationDialog(matches, newFileName);
            if (!confirmed) {
                this.currentBatchLog = null; // Clear batch log if cancelled
                return;
            }
        }

        // Iterate over each match
        for (const match of matches) {
            const file = this.app.vault.getAbstractFileByPath(match.file);
            if (!(file instanceof TFile)) {
                continue;
            }

            const content = await this.app.vault.read(file);
            const lines = content.split('\n');
            const line = lines[match.lineNumber];
            
            let newLine: string;
            if (match.oldFileName) {
                // If old file name is present, replace complete link
                const oldLinkPattern = new RegExp(`\\[\\[${match.oldFileName}#\\^${reference}(?:\\|[^\\]]+)?\\]\\]`);
                newLine = line.replace(oldLinkPattern, `[[${newFileName}#^${reference}]]`);
            } else {
                // If only block ID is present, add complete link
                const blockIdPattern = new RegExp(`\\^${reference}(?=[\\s\\]\\n]|$)`);
                newLine = line.replace(blockIdPattern, `[[${newFileName}#^${reference}]]`);
            }
            
            if (newLine !== line) {
                // Log the change
                await this.logChange({
                    timestamp: new Date().toISOString(),
                    originalFile: match.file,
                    lineNumber: match.lineNumber,
                    originalContent: line,
                    newContent: newLine,
                    blockId: reference || '',
                    oldFileName: match.oldFileName,
                    newFileName: newFileName
                });

                // Update the line
                lines[match.lineNumber] = newLine;
                await this.app.vault.modify(file, lines.join('\n'));
            }
        }

        // Write batch log to file
        await this.writeBatchToLog();
    }
}
