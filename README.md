<!--suppress HtmlDeprecatedAttribute, CheckImageSize -->
<p align='center'><img width='300' alt='hammer obliterating a piano' src="src/logo.png"/></p>
Fully online SoundFont/DLS Editor, written in TypeScript and React.
No download needed!

**v1.0.0 is here!**

## [Try it out!](https://spessasus.github.io/SpessaFont)

## Description
This is an online SoundFont/DLS editor based on [spessasynth_core](https://github.com/spessasus/spessasynth_core) and [spessasynth_lib](https://github.com/spessasus/spessasynth_lib),
inspired by
Davy7125's [polyphone](https://github.com/davy7125/polyphone).
This is also my first TypeScript and React project. It's a bit messy, but it works! :-P
## Features
- **Fully online:** *No download needed!*
- **Multiple tabs:** *Copy between sound banks or edit multiple of them at once!*
- **Multiple formats import and export:**
  - SF2 - SoundFonts!
  - SF3 - Compressed SoundFonts with compression preservation!
  - SFOGG - SF2Pack! *(import only)*
  - DLS - DownLoadable Sounds with articulator support!
  - Mobile DLS - *Apparently it's different from DLS... So I'm including it as well!*
- **Built-in MIDI player:** *Test your bank with a MIDI file!*
- **Real-time synthesizer:** 
  - *Instant response to parameter changes! (to new notes)*
  - *Full modulator support!*
  - *Full generator support!*
  - *GM, GM2, GS, XG support!*
  - *Somewhat configurable!*
- **SoundFont Extensions:**
  - **Default modulator editing:** *Via the DMOD chunk!*
  - **Limitless SoundFonts:** *Via the xdta chunk!*
- **Undo and redo system:** *It was a pain to code...*
- **Supports both light and dark modes!**
- **Useful tools:**
  - **Clipboard system:** *Automatically inserts all needed elements!*
  - **Remove unused elements:** Trim the soundbank's size!
  - **Auto-link samples:** *Automatically repair broken stereo samples based on names! (Looking at you, FluidR3_GM)*
- **Built-in MIDI Keyboard:**
  - *Clickable!*
  - *Shows the key number and velocity!*
  - *Shows keys that don't have a match for a given preset or instrument!*
  - *Controller knobs and pedals are customizable!*
  - *Supports external MIDI devices!*
  - *Looks cool!*
  - *Responds to the MIDI player!*
- **Extensive sample editing:**
  - **Automatic stereo samples handling:** *Including import and name editing!*
  - **Replace samples in-place:** *Broken sample referenced everywhere? No problem!*
  - **Easy loop point setting:** *Just click!*
  - **Insane zoom values:** *Why not?*
- **Instrument and preset editing:**
  - **Grouped stereo samples:** *Avoid clutter when making stereo banks!*
  - **Default values are shown:** *So you don't need to look them up!*
  - **Normal units:** *Only in the instrument editor...*
  - **Automatic stereo sample adding:** *Forgot to select the right sample? No problem!*
  - **Duplicate preset numbers safeguard:** *Of course!*

## Some screenshots!
<img src="https://github.com/user-attachments/assets/2efe807b-dc35-4108-a503-2d134a71bc2d" width="30%"></img> 
<img src="https://github.com/user-attachments/assets/4244a515-e4d1-4d73-b5b6-27bbbb9b3b1d" width="30%"></img> 
<img src="https://github.com/user-attachments/assets/59f31726-9935-4700-8c78-1c76f62c80d0" width="30%"></img> 
<img src="https://github.com/user-attachments/assets/a380ac0b-2e9e-431a-b00f-d5ff0dcb927a" width="30%"></img> 
<img src="https://github.com/user-attachments/assets/9ffeebf8-cc1e-41a5-9367-078b87abe5e1" width="30%"></img> 
<img src="https://github.com/user-attachments/assets/39fbe3cd-b05b-4cf5-b099-331acf2b314e" width="30%"></img> 




## Building from source
### Development
1. Make sure you have Node.js installed
2. Clone this repository
3. `npm install`
4. `npm run dev`
5. Open the link that appears in the terminal


### Build for production

1. Make sure you have Node.js installed
2. Clone this repository
3. Clone
4. `npm install`
5. `npm run build`
6. The `dist` directory contains the built HTML and other files



_Editing sound banks has never been easier!_


<p align='center'><img width='500' alt='wallace' src="https://github.com/user-attachments/assets/e263f327-1b40-476f-81c6-322077a20cf0"/></p>

<i>beautiful animation by my friend, AlfaFranekPolak</i>
