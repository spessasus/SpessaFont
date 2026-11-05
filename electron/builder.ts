import * as builder from "electron-builder";
import { existsSync } from "node:fs";
import path from "node:path";

const projectDir = path.join(import.meta.dirname, "..");

// The app is packaged from the web build, without it the window stays blank
if (!existsSync(path.join(projectDir, "dist", "index.html"))) {
    throw new Error(
        "dist/index.html is missing. Build the app first with `npm run app:dist`."
    );
}

await builder.build({
    projectDir,
    publish: "never",
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
        win: {
            icon: "public/favicon.ico",
            target: ["nsis", "portable"]
        },
        // The default names have spaces, which GitHub turns into dots on upload, while
        // latest.yml names the file with dashes, so the updater could not find the installer
        nsis: {
            artifactName: "${productName}-Setup-${version}.${ext}"
        },
        portable: {
            artifactName: "${productName}-${version}-portable.${ext}"
        },
        mac: {
            category: "Audio"
        },
        files: [
            "dist/assets/*",
            "electron/*.js",
            "package.json",
            // The icon and the manifest that index.html links to
            "dist/*.{js,html,css,ico,png,webmanifest}",
            "public/*.png",
            "LICENSE",
            // libogg and libvorbis are compiled into the encoder
            "licenses/*"
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
                ext: "sf4",
                name: "SoundFont4",
                description: "SF4 sound bank",
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
