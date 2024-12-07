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
        const self = this;

        containerEl.empty();

        // Link Update Behavior Section
        new Setting(self.containerEl).setName("Link updates").setHeading();

        // Replace existing block links setting
        new Setting(containerEl)
            .setName("Force update all block references")
            .setDesc(
                "Update all block references, even if they point to valid blocks in other files. By default (off), only broken or invalid block references will be updated.",
            )
            .addToggle((toggle) => {
                toggle
                    .setValue(self.plugin.settings.replaceExistingBlockLinks)
                    .onChange(async (value) => {
                        self.plugin.settings.replaceExistingBlockLinks = value;
                        await self.plugin.saveSettings();
                    });
            });

        // Show confirmation dialog setting
        new Setting(containerEl)
            .setName("Show confirmation dialog")
            .setDesc(
                "Show a dialog to review and confirm changes before updating any links",
            )
            .addToggle((toggle) => {
                toggle
                    .setValue(self.plugin.settings.showConfirmationDialog)
                    .onChange(async (value) => {
                        self.plugin.settings.showConfirmationDialog = value;
                        await self.plugin.saveSettings();
                    });
            });

        // Change Tracking Section
        new Setting(self.containerEl).setName("Change tracking").setHeading();

        // Enable change logging setting
        new Setting(containerEl)
            .setName("Enable change logging")
            .setDesc("Keep a record of all link updates for future reference")
            .addToggle((toggle) => {
                toggle
                    .setValue(self.plugin.settings.enableChangeLogging)
                    .onChange(async (value) => {
                        self.plugin.settings.enableChangeLogging = value;
                        await self.plugin.saveSettings();
                    });
            });

        // Log file path setting (only show if logging is enabled)
        if (self.plugin.settings.enableChangeLogging) {
            new Setting(containerEl)
                .setName("Log file path")
                .setDesc("Path to the log file (relative to vault root)")
                .addText((text) => {
                    text.setValue(self.plugin.settings.logFilePath).onChange(
                        async (value) => {
                            self.plugin.settings.logFilePath = value;
                            await self.plugin.saveSettings();
                        },
                    );
                });
        }
    }
}
