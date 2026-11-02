#!/usr/bin/bash
cd "$(dirname "$0")"

cd ..

npm uninstall spessasynth_core

npm install -D spessasynth_core
npm pkg set devDependencies.spessasynth_core=latest

npm prune