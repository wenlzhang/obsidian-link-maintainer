# Link Maintainer

[![GitHub release (Latest by date)](https://img.shields.io/github/v/release/wenlzhang/obsidian-link-maintainer)](https://github.com/wenlzhang/obsidian-link-maintainer/releases) ![GitHub all releases](https://img.shields.io/github/downloads/wenlzhang/obsidian-link-maintainer/total?color=success)

An [Obsidian](https://obsidian.md/) plugin that helps you maintain various types of links when splitting or reorganizing notes.

## Features

- **Update three types of Obsidian links**:
  - Note links (`[[filename]]`)
  - Heading links (`[[filename#Heading]]`)
  - Block references (`[[filename#^blockid]]`)
- **Smart block reference handling**:
  - Update block references directly from selected text
  - Option to replace or preserve existing block links
  - Maintains block IDs while updating file paths
- **Safe updates**:
  - Preview all changes before applying
  - Confirmation dialog for reviewing updates
  - Changes can be reviewed and confirmed in batches
- **Change tracking**:
  - Detailed logging of all link updates
  - Track original and new link locations
  - Maintain history of all modifications

## Use Cases

### When You Split Notes
If you have a large note that you split into smaller notes, links in other notes might become invalid. This plugin helps you update those references to point to the new location.

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

## Installation

1. Open Obsidian Settings
2. Navigate to Community Plugins and disable Safe Mode
3. Click Browse and search for "Link Maintainer"
4. Install the plugin
5. Enable the plugin in your Community Plugins list

## Development

This plugin is built using the Obsidian Plugin API. To build from source:

1. Clone this repository
2. Run `npm install`
3. Run `npm run dev` for development builds
4. Run `npm run build` for production builds

## Support

If you encounter any issues or have suggestions for improvements, please open an issue on the GitHub repository.

## License

MIT License. See [LICENSE](LICENSE) for more information.
