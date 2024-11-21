# Link Maintainer

[![GitHub release (Latest by date)](https://img.shields.io/github/v/release/wenlzhang/obsidian-link-maintainer)](https://github.com/wenlzhang/obsidian-link-maintainer/releases) ![GitHub all releases](https://img.shields.io/github/downloads/wenlzhang/obsidian-link-maintainer/total?color=success)

An [Obsidian](https://obsidian.md/) plugin that helps you maintain various types of links when splitting or reorganizing notes.

## Features

- Search for and update three types of links:
  - Regular note links (e.g., `[[filename]]`)
  - Heading links (e.g., `[[filename#Heading]]`)
  - Block references (e.g., `[[filename#^blockid]]`)
- Search for specific references across your entire vault
- Update file paths while preserving headings and block IDs
- Preview changes before applying them
- Batch update all references at once

## Use Cases

### When You Split Notes
If you have a large note that you split into smaller notes, links in other notes might become invalid. This plugin helps you update those references to point to the new location.

### When You Reorganize Notes
When reorganizing your vault structure or renaming files, you can easily update all references to maintain their validity.

## How to Use

1. Open the Command Palette (`Cmd/Ctrl + P`)
2. Search for "Update Link References"
3. Select the type of link you want to update:
   - Note Link: For regular note links like `[[filename]]`
   - Heading Link: For heading references like `[[filename#Heading]]`
   - Block Link: For block references like `[[filename#^blockid]]`
4. Enter:
   - Old file name (the current file containing the reference)
   - New file name (where the content has been moved to)
   - Heading text (only for heading links)
   - Block ID (only for block links)
5. Review the found matches
6. Click "Confirm Replacement" to update all references

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

## Installation

1. Open Obsidian Settings
2. Navigate to Community Plugins and disable Safe Mode
3. Click Browse and search for "Block Link Maintainer"
4. Install the plugin
5. Enable the plugin in your Community Plugins list

## Development

This plugin is built using the Obsidian Plugin API. To build from source:

1. Clone this repository
2. Run `npm install`
3. Run `npm run build`

## Support

If you encounter any issues or have suggestions for improvements, please open an issue on the GitHub repository.

## License

MIT License. See [LICENSE](LICENSE) for more information.
