# Link Maintainer

[![GitHub release (Latest by date)](https://img.shields.io/github/v/release/wenlzhang/obsidian-link-maintainer)](https://github.com/wenlzhang/obsidian-link-maintainer/releases) ![GitHub all releases](https://img.shields.io/github/downloads/wenlzhang/obsidian-link-maintainer/total?color=success)

An [Obsidian](https://obsidian.md/) plugin that helps you maintain block references when splitting or reorganizing notes, with a focus on safety and reliability.

## Why You Need Link Maintainer

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

## Documentation

📚 **[View Full Documentation](https://exp.ptkm.net/obsidian-link-maintainer)**

Visit the documentation site to learn how to make the most of Link Maintainer in your Obsidian workflow.

## Support & Community

This plugin is a labor of love, developed and maintained during my free time after work and on weekends. A lot of thought, energy, and care goes into making it reliable, user-friendly, and aligned with PTKM principles.

If you find this plugin valuable in your daily workflow:

- If it helps you manage tasks more effectively
- If it saves you time and mental energy
- If it makes your work between Obsidian and Todoist smoother

Please consider supporting my work. Your support would mean the world to me and would help me dedicate more time and energy to:

- Developing new features
- Maintaining code quality
- Providing support and documentation
- Making the plugin even better for everyone

### Ways to Support

You can support this project in several ways:

- ⭐ Star the project on GitHub
- 💝 <a href='https://ko-fi.com/C0C66C1TB' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=3' border='0' alt='Buy Me a Coffee' /></a>
- [Sponsor](https://github.com/sponsors/wenlzhang) my work on GitHub
- 💌 Share your success stories and feedback
- 📢 Spread the word about the plugin
- 🐛 [Report issues](https://github.com/wenlzhang/obsidian-link-maintainer/issues) to help improve the plugin

Thank you for being part of this journey! 🙏
