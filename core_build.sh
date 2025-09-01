cd ../spessasynth_core
npm run local-build
cd ../SpessaFont
npm uninstall spessasynth_core; npm install ../spessasynth_core/spessasynth_core-4.0.0.tgz
vite dev