#!/usr/bin/bash
cd "$(dirname "$0")"

cd ..

npm uninstall spessasynth_lib
npm uninstall spessasynth_core

npm install spessasynth_core
npm pkg set dependencies.spessasynth_core=latest

npm install spessasynth_lib
npm pkg set dependencies.spessasynth_lib=latest

npm prune