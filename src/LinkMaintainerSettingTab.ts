import { default as LinkMaintainer } from "./main";
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

        // Link Update Behavior Section
        new Setting(this.containerEl).setName("Link updates").setHeading();

        // Replace existing block links setting
        new Setting(containerEl)
            .setName('Force update all block references')
            .setDesc('Update all block references, even if they point to valid blocks in other files. By default (off), only broken or invalid block references will be updated.')
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.replaceExistingBlockLinks)
                    .onChange(async (value) => {
                        this.plugin.settings.replaceExistingBlockLinks = value;
                        await this.plugin.saveSettings();
                    });
            });

        // Show confirmation dialog setting
        new Setting(containerEl)
            .setName('Show confirmation dialog')
            .setDesc('Show a dialog to review and confirm changes before updating any links')
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.showConfirmationDialog)
                    .onChange(async (value) => {
                        this.plugin.settings.showConfirmationDialog = value;
                        await this.plugin.saveSettings();
                    });
            });

        // Change Tracking Section
        new Setting(this.containerEl).setName("Change tracking").setHeading();

        // Enable change logging setting
        new Setting(containerEl)
            .setName('Enable change logging')
            .setDesc('Keep a record of all link updates for future reference')
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.enableChangeLogging)
                    .onChange(async (value) => {
                        this.plugin.settings.enableChangeLogging = value;
                        await this.plugin.saveSettings();
                    });
            });

        // Log file path setting (only show if logging is enabled)
        if (this.plugin.settings.enableChangeLogging) {
            new Setting(containerEl)
                .setName('Log file path')
                .setDesc('Path to the log file (relative to vault root)')
                .addText((text) => {
                    text
                        .setValue(this.plugin.settings.logFilePath)
                        .onChange(async (value) => {
                            this.plugin.settings.logFilePath = value;
                            await this.plugin.saveSettings();
                        });
                });
        }
    }
}
