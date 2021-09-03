import {MenuItem, Plugin, TAbstractFile, TFolder} from "obsidian";
import {mount, unmount} from "redom";
import {Explorer, hoverSource} from "./Explorer";

import "./redom-jsx";
import "./styles.scss"

declare module "obsidian" {
    interface Workspace {
        registerHoverLinkSource(source: string, info: {display: string, defaultMod?: boolean}): void
        unregisterHoverLinkSource(source: string): void
    }
}

export default class extends Plugin {
    statusbarItem: HTMLElement
    explorer: Explorer

    onload() {
        this.app.workspace.onLayoutReady( () => {
            const buttonContainer = document.body.find(".titlebar .titlebar-button-container.mod-left");
            this.register(() => unmount(buttonContainer, this.explorer));
            mount(buttonContainer, this.explorer = new Explorer(this.app));
            this.explorer.update(this.app.workspace.getActiveFile())
            this.registerEvent(this.app.workspace.on("file-open", this.explorer.update, this.explorer));
            this.registerEvent(this.app.vault.on("rename", this.onFileChange, this));
            this.registerEvent(this.app.vault.on("delete", this.onFileChange, this));
        });
        this.app.workspace.registerHoverLinkSource(hoverSource, {
            display: 'Quick Explorer', defaultMod: true
        });

        this.addCommand({ id: "browse-vault",   name: "Browse vault",          callback: () => { this.explorer?.browseVault(); }, });
        this.addCommand({ id: "browse-current", name: "Browse current folder", callback: () => { this.explorer?.browseCurrent(); }, });

        this.registerEvent(this.app.workspace.on("file-menu", (menu, file, source) => {
            let item: MenuItem
            if (source !== "quick-explorer") menu.addItem(i => {
                i.setIcon("folder").setTitle("Show in Quick Explorer").onClick(e => { this.explorer?.browseFile(file); });
                item = i;
            })
            if (item) {
                const revealFile = i18next.t(`plugins.file-explorer.action-reveal-file`);
                const idx = menu.items.findIndex(i => i.titleEl.textContent === revealFile);
                (menu.dom as HTMLElement).insertBefore(item.dom, menu.items[idx+1].dom);
                menu.items.remove(item);
                menu.items.splice(idx+1, 0, item);
            }
        }));

        Object.defineProperty(TFolder.prototype, "basename", {get(){ return this.name; }, configurable: true})
    }

    onunload() {
        this.app.workspace.unregisterHoverLinkSource(hoverSource);
    }

    onFileChange(file: TAbstractFile) {
        if (file === this.explorer.lastFile) this.explorer.update(file);
    }
}
