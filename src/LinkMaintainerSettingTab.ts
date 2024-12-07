import { LinkMaintainer } from "./main";
import { PluginSettingTab, App, Setting } from "obsidian";

export class LinkMaintainerSettingTab extends PluginSettingTab {
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
