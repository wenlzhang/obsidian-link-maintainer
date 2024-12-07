# Link Maintainer

[![GitHub release (Latest by date)](https://img-shields.io/github/v/release/wenlzhang/obsidian-link-maintainer)](https://github.com/wenlzhang/obsidian-link-maintainer/releases) ![GitHub all releases](https://img-shields.io/github/downloads/wenlzhang/obsidian-link-maintainer/total?color=success)

An [Obsidian](https://obsidian.md/) plugin that helps you maintain block references when splitting or reorganizing notes, with a focus on safety and reliability.

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

### Comprehensive Block Reference Support

- **Update block references**:
  - Automatically update block references in markdown notes and canvas files
- **Canvas Integration**:
  - Updates block references within canvas nodes

### Smart Block Reference Handling

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

## How to Use

The plugin provides a command to help you maintain block references in your vault:

### Available Command

**Update block references from selection** (`Cmd/Ctrl + P`)

- Select text containing a block ID in your note
- Run the command through Command Palette
- The plugin will update all references to that block

### Workflow Example

1. **Select Block Reference**:
   - Find the line containing your block ID (e.g., `^important-block`)
   - Select that line in your note
2. **Run Command**:
   - Open Command Palette (`Cmd/Ctrl + P`)
   - Choose "Update block references from selection"
3. **Review Changes**:
   - The plugin shows you all found references
   - Each reference shows:
     - File location
     - Current content
     - Preview of the change
4. **Confirm Updates**:
   - Review the proposed changes
   - Click "Confirm" to apply the updates
   - All changes will be logged if logging is enabled

### Example

```markdown
// new-note.md (current file)
Some important text here ^important-block

// other-notes.md (will be updated)
Before: [[old-note#^important-block]]
After:  [[new-note#^important-block]]
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

## Installation

1. Open Obsidian Settings
2. Navigate to Community Plugins and disable Safe Mode
3. Click Browse and search for "Link Maintainer"
4. Install the plugin
5. Enable the plugin in your Community Plugins list

## Support me

<a href='https://ko-fi.com/C0C66C1TB' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
