import * as builder from "electron-builder";
import * as vite from "vite";
import path from "node:path";

const projectDir = path.join(import.meta.dirname, "..");

await vite.build();

await builder.build({
    projectDir,
    publish: "always",
    config: {
        productName: "SpessaFont",
        appId: "com.spessasus.SpessaFont",
        icon: "public/logo.png",
        copyright: `Copyright © Spessasus ${new Date().getFullYear()}, Licensed under the Apache-2.0 License.`,
        directories: {
            output: "dist/desktop"
        },
        linux: {
            category: "Audio",
            target: ["AppImage", "deb"]
        },
        publish: {
            provider: "github",
            owner: "spessasus",
            repo: "SpessaFont"
        },
        win: {
            icon: "public/favicon.ico",
            target: ["nsis", "portable"]
        },
        mac: {
            category: "Audio"
        },
        files: [
            "dist/assets/*",
            "electron/*.js",
            "package.json",
            "dist/*.{js,html,css}",
            "public/*.png",
            "LICENSE",
            "externals/sl-web-ogg/Ogg-COPYING",
            "externals/sl-web-ogg/Vorbis-COPYING",
            "externals/sl-web-ogg/LICENSE"
        ],
        fileAssociations: [
            {
                ext: "sf2",
                name: "SoundFont2",
                description: "SoundFont2 sound bank",
                role: "Editor"
            },
            {
                ext: "sf3",
                name: "SoundFont3",
                description: "Compressed SoundFont3 sound bank",
                role: "Editor"
            },
            {
                ext: "sfogg",
                name: "SF2Pack",
                description: "Compressed SF2Pack sound bank",
                role: "Editor"
            },
            {
                ext: "dls",
                name: "Downloadable Sounds",
                description: "DownLoadable Sounds sound bank",
                role: "Editor"
            },
            {
                ext: "dlp",
                name: "Downloadable Sounds",
                description: "DownLoadable Sounds sound bank",
                role: "Editor"
            },
            {
                ext: "rmi",
                name: "Embedded MIDI",
                description: "RMIDI file with embedded sound bank",
                role: "Editor"
            }
        ]
    }
});
