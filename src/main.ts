import { Notice, Plugin } from 'obsidian';
import { BookSearchModal } from './book_search_modal';
import { Book, BookSuggestModal } from './book_suggest_modal';
import { CursorJumper } from './editor/corsor_jumper';

import {
  BookSearchSettingTab,
  BookSearchPluginSettings,
  DEFAULT_SETTINGS,
} from './settings/settings';
import {
  makeFrontMater,
  replaceIllegalFileNameCharactersInString,
} from './utils/utils';

export default class BookSearchPlugin extends Plugin {
  settings: BookSearchPluginSettings;

  async onload() {
    await this.loadSettings();

    // This creates an icon in the left ribbon.
    const ribbonIconEl = this.addRibbonIcon(
      'book',
      'Create new book note',
      (evt: MouseEvent) => this.createNewBookNote(),
    );
    // Perform additional things with the ribbon
    ribbonIconEl.addClass('obsidian-book-search-plugin-ribbon-class');

    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: 'open-book-search-modal',
      name: 'Create new book note',
      callback: () => this.createNewBookNote(),
    }); //

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new BookSearchSettingTab(this.app, this));
  }

  async createNewBookNote(): Promise<void> {
    try {
      const book = await this.openBookSearchModal();
      const fileName = replaceIllegalFileNameCharactersInString(book.title);
      const path = `${this.settings.folder.replace(/\/$/, '')}/${fileName}.md`;
      const frontMatter = makeFrontMater(book);
      const fileContent = `---\n${frontMatter}\n---\n`;
      const targetFile = await this.app.vault.create(path, fileContent);

      const activeLeaf = this.app.workspace.activeLeaf;
      if (!activeLeaf) {
        console.warn('No active leaf');
        return;
      }
      await activeLeaf.openFile(targetFile, { state: { mode: 'source' } });
      activeLeaf.setEphemeralState({ rename: 'all' });
      await new CursorJumper(this.app).jumpToNextCursorLocation();
    } catch (err) {
      console.warn(err);
      new Notice(err.toString());
    }
  }

  async openBookSearchModal(): Promise<Book> {
    return new Promise((resolve, reject) => {
      new BookSearchModal(this.app, (error, results) => {
        if (error) return reject(error);
        new BookSuggestModal(this.app, results, (error2, selectedBook) => {
          if (error2) return reject(error2);
          resolve(selectedBook);
        }).open();
      }).open();
    });
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}