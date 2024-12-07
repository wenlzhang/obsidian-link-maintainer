# Link Maintainer

[![GitHub release (Latest by date)](https://img-shields.io/github/v/release/wenlzhang/obsidian-link-maintainer)](https://github.com/wenlzhang/obsidian-link-maintainer/releases) ![GitHub all releases](https://img-shields.io/github/downloads/wenlzhang/obsidian-link-maintainer/total?color=success)

An [Obsidian](https://obsidian.md/) plugin that helps you maintain various types of links when splitting or reorganizing notes, with a focus on safety and reliability.

## The Story Behind the Plugin

Have you ever found yourself in this situation? You're working with a long note in Obsidian, and you realize that a particular section would be more valuable as its own note. This is a common scenario when:

- You want to make certain information more discoverable
- You need to link the same content in multiple contexts
- You're reorganizing your knowledge base for better structure

Obsidian provides ways to extract text into a new note, either through its native features or various community plugins. However, there's a catch: **what happens to all the block references pointing to that text?**

### The Block Reference Challenge

Let's say you have:
```markdown
// original-long-note.md
A long note with many sections...
Some important text here ^important-block
More content...

// other-notes.md
References to the important text [[original-long-note#^important-block]]
```

When you extract the section with `^important-block` into a new note:

1. The block ID moves to the new note
2. All existing references in other notes still point to the original note
3. These references are now broken because the block ID no longer exists there

### The Manual Fix

Without this plugin, you would need to:

1. Find every note that references the block ID
2. Manually update each reference to point to the new note
3. Repeat this process for canvas files
4. Hope you didn't miss any references

This is tedious, error-prone, and time-consuming - especially if the block is referenced in multiple places or canvas files.

### The Solution

This is exactly why Link Maintainer exists. With this plugin, you can:

1. Select the line containing the block ID
2. Run a single command
3. Let the plugin automatically update all references - both in markdown notes and canvas files

No more manual searching and replacing. No more broken references. Just smooth, reliable link maintenance that lets you focus on organizing your knowledge the way you want.

## Features

### Comprehensive Link Support

- **Update three types of Obsidian links**:
  - Note links (`[[filename]]`)
  - Heading links (`[[filename#Heading]]`)
  - Block references (`[[filename#^blockid]]`)
- **Canvas Integration**:
  - Updates block references within canvas nodes

### Smart Link Management

- **Smart block reference handling**:
  - Update block references directly from selected text
  - Option to replace or preserve existing block links
    - Default safe mode: only updates broken or invalid links
    - Optional force update mode for complete link consolidation
  - Maintains block IDs while updating file paths

### Safety and Reliability

- **Safe updates**:
  - Preview all changes before applying
  - Confirmation dialog for reviewing updates
  - Clear display of affected files and locations
- **Change tracking**:
  - Detailed logging of all link updates
  - Maintain history of all modifications

## Use Cases

### When You Split Notes

If you have a large note that you split into smaller notes, block references in other notes might become invalid. This plugin helps you update those references to point to the new location, with built-in safeguards to prevent accidental changes.

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
     - Heading or block ID (if applicable)
2. **Update block references from selection**
   - Select text containing a block ID in your note
   - Run the command through Command Palette
   - The plugin will update all references to that block

### Workflow Example

1. **Find References**:
   - Open Command Palette (`Cmd/Ctrl + P`)
   - Choose the appropriate command:
     - "Update link references" for any type of link
     - "Update block references from selection" for block IDs
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

This plugin implements several safety and redundancy features following PTKM principles:

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

## Installation

1. Open Obsidian Settings
2. Navigate to Community Plugins and disable Safe Mode
3. Click Browse and search for "Link Maintainer"
4. Install the plugin
5. Enable the plugin in your Community Plugins list

## Support me

<a href='https://ko-fi.com/C0C66C1TB' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
