import { App, Modal } from 'obsidian';
import { LinkMatch } from './types';

export class ConfirmationDialog extends Modal {
    private matches: LinkMatch[];
    private newFileName: string;
    private resolvePromise: ((value: boolean) => void) | null = null;

    constructor(app: App, matches: LinkMatch[], newFileName: string) {
        super(app);
        this.matches = matches;
        this.newFileName = newFileName;
    }

    async showDialog(): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            this.resolvePromise = resolve;
            this.open();
        });
    }

    onOpen() {
        this.titleEl.setText('Confirm Link Updates');
        const { contentEl } = this;

        contentEl.createEl('p', {
            text: `You are about to update ${this.matches.length} block reference${this.matches.length > 1 ? 's' : ''} to point to "${this.newFileName}".`,
            attr: { style: 'margin-bottom: 12px;' }
        });

        if (this.matches.length > 0) {
            const list = contentEl.createEl('div', {
                cls: 'link-maintainer-changes-list',
                attr: { style: 'max-height: 200px; overflow-y: auto; margin-bottom: 12px; padding: 8px; border: 1px solid var(--background-modifier-border); border-radius: 4px;' }
            });

            this.matches.forEach((match, index) => {
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

        contentEl.createEl('p', {
            cls: 'link-maintainer-warning',
            text: 'This action cannot be automatically undone. Changes will be logged if logging is enabled.',
            attr: { style: 'color: var(--text-warning); margin-bottom: 12px;' }
        });

        const buttonContainer = contentEl.createEl('div', {
            attr: { style: 'display: flex; justify-content: flex-end; gap: 8px;' }
        });

        buttonContainer.createEl('button', {
            text: 'Cancel',
            attr: { style: 'padding: 4px 12px;' }
        }).onclick = () => {
            this.close();
            this.resolvePromise?.(false);
        };

        const confirmButton = buttonContainer.createEl('button', {
            cls: 'mod-cta',
            text: 'Confirm Updates',
            attr: { style: 'padding: 4px 12px;' }
        });
        confirmButton.onclick = () => {
            this.close();
            this.resolvePromise?.(true);
        };
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        this.resolvePromise?.(false);
    }
}
