#!/usr/bin/bash
cd "$(dirname "$0")"

cd ..

npm uninstall spessasynth_lib
npm uninstall spessasynth_core

npm install ../spessasynth_core
npm install ../spessasynth_lib