import { LinkMaintainerSettings } from "./types";

export const DEFAULT_SETTINGS: LinkMaintainerSettings = {
    replaceExistingBlockLinks: false,
    enableChangeLogging: true,
    logFilePath: "link-maintainer-changes.md",
    showConfirmationDialog: true,
};
