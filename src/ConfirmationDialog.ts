import { App, Modal } from 'obsidian';
import { LinkMatch } from './types';

export async function showConfirmationDialog(app: App, matches: LinkMatch[], newFileName: string): Promise<boolean> {
    return new Promise((resolve) => {
        const modal = new Modal(app);
        modal.titleEl.setText('Confirm Link Updates');
        
        const content = modal.contentEl;
        content.empty();
        
        content.createEl('p', {
            text: `You are about to update ${matches.length} block reference${matches.length > 1 ? 's' : ''} to point to "${newFileName}".`,
            attr: { style: 'margin-bottom: 12px;' }
        });

        if (matches.length > 0) {
            const list = content.createEl('div', {
                cls: 'link-maintainer-changes-list',
                attr: { style: 'max-height: 200px; overflow-y: auto; margin-bottom: 12px; padding: 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px;' }
            });

            matches.forEach((match, index) => {
                const item = list.createEl('div', {
                    attr: { style: 'margin-bottom: 8px; font-size: 0.9em;' }
                });
                item.createEl('div', {
                    text: `${index + 1}. In file: ${match.file}`,
                    attr: { style: 'color: var(--text-muted);' }
                });
                item.createEl('div', {
                    text: match.lineContent,
                    attr: { style: 'font-family: monospace; white-space: pre-wrap; margin-top: 4px;' }
                });
            });
        }

        const warningEl = content.createEl('p', {
            cls: 'link-maintainer-warning',
            text: 'This action cannot be automatically undone. Changes will be logged if logging is enabled.',
            attr: { style: 'color: var(--text-warning); margin-bottom: 12px;' }
        });

        // Buttons container
        const buttonContainer = content.createEl('div', {
            attr: { style: 'display: flex; justify-content: flex-end; gap: 8px;' }
        });

        // Cancel button
        buttonContainer.createEl('button', {
            text: 'Cancel',
            attr: { style: 'padding: 4px 12px;' }
        }).onclick = () => {
            modal.close();
            resolve(false);
        };

        // Confirm button
        const confirmButton = buttonContainer.createEl('button', {
            cls: 'mod-cta',
            text: 'Confirm Updates',
            attr: { style: 'padding: 4px 12px;' }
        });
        confirmButton.onclick = () => {
            modal.close();
            resolve(true);
        };

        modal.open();
    });
}
