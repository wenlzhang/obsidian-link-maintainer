# Link Maintainer

[![GitHub release (Latest by date)](https://img-shields.io/github/v/release/wenlzhang/obsidian-link-maintainer)](https://github.com/wenlzhang/obsidian-link-maintainer/releases) ![GitHub all releases](https://img.shields.io/github/downloads/wenlzhang/obsidian-link-maintainer/total?color=success)

An [Obsidian](https://obsidian.md/) plugin that helps you maintain various types of links when splitting or reorganizing notes, with a focus on safety and reliability.

## Features

### Comprehensive Link Support
- **Update three types of Obsidian links**:
  - Note links (`[[filename]]`)
  - Heading links (`[[filename#Heading]]`)
  - Block references (`[[filename#^blockid]]`)
- **Canvas Integration**:
  - Full support for links in canvas files
  - Maintains canvas node relationships
  - Updates block references within canvas nodes

### Smart Link Management
- **Smart block reference handling**:
  - Update block references directly from selected text
  - Option to replace or preserve existing block links
  - Maintains block IDs while updating file paths
  - Default safe mode: only updates broken or invalid links
  - Optional force update mode for complete link consolidation

### Safety and Reliability
- **Safe updates**:
  - Preview all changes before applying
  - Confirmation dialog for reviewing updates
  - Changes can be reviewed and confirmed in batches
  - Clear display of affected files and locations
- **Change tracking**:
  - Detailed logging of all link updates
  - Track original and new link locations
  - Maintain history of all modifications
  - Easy-to-read markdown format
  - Grouped by update sessions
  - Includes file paths and line numbers (where applicable)

## Usage

### When You Split Notes
If you have a large note that you split into smaller notes, links in other notes might become invalid. This plugin helps you update those references to point to the new location, with built-in safeguards to prevent accidental changes.

### When You Reorganize Notes

When reorganizing your vault structure or renaming files, you can easily update all references to maintain their validity.

## How to Use

The plugin provides two commands to help you maintain links in your vault:

### Available Commands

1. **Update link references** (`Cmd/Ctrl + P`)
   - Opens a dialog to update any type of link:
     - Note links (`[[filename]]`)
     - Heading links (`[[filename#Heading]]`)
     - Block references (`[[filename#^blockid]]`)
   - You'll need to provide:
     - Old file name (for note/heading links)
     - New file name
     - Heading or block reference (if applicable)
2. **Update block references from selection**
   - Select text containing a block reference in your note
   - Run the command through Command Palette
   - The plugin will update all references to that block

### Workflow Example

1. **Find References**:
   - Open Command Palette (`Cmd/Ctrl + P`)
   - Choose the appropriate command:
     - "Update link references" for any type of link
     - "Update block references from selection" for block references
   - Enter the required information in the dialog
2. **Review Changes**:
   - The plugin shows you all found references
   - Each reference shows:
     - File location
     - Current content
     - Preview of the change
3. **Confirm Updates**:
   - Review the proposed changes
   - Click "Confirm" to apply the updates
   - All changes will be logged if logging is enabled

### Examples

For note links:
```markdown
Before: [[oldNote]]
After:  [[newNote]]
```

For heading links:
```markdown
Before: [[oldNote#Introduction]]
After:  [[newNote#Introduction]]
```

For block references:
```markdown
Before: [[oldNote#^abc123]]
After:  [[newNote#^abc123]]
```

## Block Reference Handling

### Smart Block Reference Updates

#### Default Behavior (Safe Mode)
By default, the plugin only updates block references that are "broken" or no longer valid. This means:
- If a block reference exists in multiple files, links pointing to valid locations won't be changed
- Only links pointing to locations where the block no longer exists will be updated
- This prevents accidentally breaking valid references when blocks are duplicated across notes

#### Force Update Mode
You can enable "Force Update All Block References" in settings to change this behavior:
- All block references will be updated to point to the new location
- This is useful when you want to ensure all references point to a specific instance of a block
- Helpful when consolidating or reorganizing notes where blocks might exist in multiple places


When reorganizing your vault structure or renaming files, you can easily update all references while maintaining link integrity:
1. Preview changes before applying
2. Confirm updates through a clear dialog
3. Track all modifications in the change log

## Settings

The plugin provides several settings to customize its behavior:

- **Replace Existing Block Links**: Choose whether to replace block links that already exist in the target file
- **Show Confirmation Dialog**: Enable/disable confirmation before applying changes
- **Change Logging**:
  - Enable/disable logging of link updates
  - Set log file path (default: 'link-maintainer-changes.md')
  - Log entries include:
    - Timestamp of changes
    - Original and new file paths
    - Line numbers and content changes
    - Block IDs for block references
    - Batch operation details

### Link Updates
- **Force update all block references**: Choose between safe mode (default) and force update mode
  - Safe mode: Only updates broken or invalid links
  - Force mode: Updates all references to point to the new location
- **Show confirmation dialog**: Review and confirm changes before they're applied

### Change Tracking
- **Enable change logging**: Keep a detailed record of all updates
- **Log file path**: Customize where change logs are stored

## Examples

### Block Reference Updates
```markdown
// Before update
^blockId in original-note.md
[[original-note#^blockId]] in other files

// After update (Safe Mode)
- Only updates broken links
- Preserves valid references
- Maintains note integrity

// After update (Force Mode)
- Updates all references to new location
- Consolidates links to single source
- Complete link consistency
```

### Canvas Updates
```markdown
// Canvas nodes are fully supported
- Updates links within canvas nodes
- Preserves canvas layout and connections
- Maintains block references in canvas files
```

## Block Reference Handling

### Smart Block Reference Updates

The plugin includes an intelligent block reference update system that helps maintain the integrity of your links while allowing flexibility in how updates are handled.

## Safety Features

This plugin implements several safety and redundancy features following PTTM principles:

1. **Prevention**:
   - Confirmation dialogs before updates
   - Preview of all changes
   - Safe mode for block references
   - Validation of link targets

2. **Tracking**:
   - Comprehensive change logging
   - Detailed update history
   - Clear modification records
   - Canvas node tracking

3. **Transparency**:
   - Clear display of affected files
   - Explicit update confirmations
   - Readable log format
   - Visual preview of changes

4. **Maintainability**:
   - Structured log files
   - Configurable settings
   - Flexible update modes
   - Canvas compatibility

## Best Practices

1. **Regular Backups**: While the plugin includes safety features, always maintain backups of your vault
2. **Review Changes**: Use the confirmation dialog to verify updates before applying
3. **Monitor Logs**: Check the change log to track modifications and ensure desired outcomes
4. **Choose Update Mode**: Use safe mode for general updates and force mode when consolidating references
5. **Canvas Considerations**: Review canvas node connections when updating links in canvas files

## Installation

1. Open Obsidian Settings
2. Navigate to Community Plugins and disable Safe Mode
3. Click Browse and search for "Link Maintainer"
4. Install the plugin
5. Enable the plugin in your Community Plugins list

## License

MIT License. See [LICENSE](LICENSE) for more information.

## Support me

<a href='https://ko-fi.com/C0C66C1TB' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
