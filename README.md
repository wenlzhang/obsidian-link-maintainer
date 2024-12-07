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

## Usage

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

## Block Reference Handling

### Smart Block Reference Updates

The plugin includes an intelligent block reference update system that helps maintain the integrity of your links while allowing flexibility in how updates are handled.

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

#### Example Scenario

Consider this situation:
```markdown
// original-note.md
Some text with a block reference ^block123

// another-note.md
A link to the block [[original-note#^block123]]

// new-note.md
The same text copied over ^block123
```

With default settings (Force Update OFF):
- The link in `another-note.md` won't be updated because it points to a valid block
- This preserves existing valid references

With Force Update enabled:
- The link will be updated to `[[new-note#^block123]]`
- This ensures all references point to the new location
- Useful when you want to consolidate all references to a single instance

Choose the setting based on your note organization style:
- Keep it OFF if you often have intentionally duplicated blocks
- Turn it ON if you prefer to maintain single sources of truth for blocks

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

## License

MIT License. See [LICENSE](LICENSE) for more information.

## Support me

<a href='https://ko-fi.com/C0C66C1TB' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
