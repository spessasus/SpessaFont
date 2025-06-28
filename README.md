<!--suppress HtmlDeprecatedAttribute, CheckImageSize -->
<p align='center'><img width='300' alt='hammer obliterating a piano' src="src/logo.png"/></p>
Fully online SoundFont/DLS Editor, written in TypeScript and React.
No download needed!

## [Link](https://spessasus.github.io/SpessaFont)

## Description
This is an online SoundFont/DLS editor based on [spessasynth_core](https://github.com/spessasus/spessasynth_core) and [spessasynth_lib](https://github.com/spessasus/spessasynth_lib),
inspired by
Davy7125's [polyphone](https://github.com/davy7125/polyphone).
This is also my first TypeScript and React project.


> [!NOTE]
> This is still in progress!
> There are still features not yet implemented or tested.
> Use at your own discretion.

## Features
- **Fully online:** *No download needed!*
- **Multiple tabs:** *Copy between soundfonts!*
- **Multiple formats import and export:**
  - SF2
  - SF3
  - SF2Pack (.sfogg vorbis compression)
  - DLS
  - Mobile DLS
- **Built-in MIDI player:** *Test your bank with a MIDI file!*
- **Real-time modulator and generator editing:** *Instant response to parameter changes!*
- **Default Modulator Editing!:** *Via the DMOD chunk!*
- **Limitless SoundFonts:** *Via the xdta chunk!*
- **Undo and redo system:** *It was a pain to code...*
- **Clipboard:** *Automatically inserts all needed elements!*
- **Built-in MIDI Keyboard:**
  - *Clickable!*
  - *Shows the key number and velocity!*
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


## Building from source
### Development (and testing it for yourself)
1. Make sure you have Node.js installed
2. Clone this repository
3. `npm install`
4. `npm run dev`


### Build for production

> [!NOTE]
> The sources sometimes may be not buildable for production (e.g., unused variables throwing TS errors)
>, So it's recommended to use the dev mode.

1. Make sure you have Node.js installed
2. Clone this repository
3. Clone
4. `npm install`
5. `npm run build`



_Editing sound banks has never been easier!_


<p align='center'><img width='500' alt='wallace' src="https://github.com/user-attachments/assets/e263f327-1b40-476f-81c6-322077a20cf0"/></p>

<i>beautiful animation by my friend, AlfaFranekPolak</i>