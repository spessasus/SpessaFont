# Security policy

## Supported versions

Only the latest release of SpessaFont is supported, both the web app and the desktop app.
Please ensure that the problem still happens there before reporting it.

## Reporting a vulnerability

Please do not open a public issue for a security problem.
Use GitHub's private vulnerability reporting instead, with the "Report a vulnerability" button in the Security tab of this repository.

Include the version, the steps or the file that trigger the problem, and what happens.

SpessaFont opens sound bank and MIDI files, so crashes, hangs or runaway memory use on a malformed file are in scope.
A problem in file parsing may come from [`spessasynth_core`](https://github.com/spessasus/spessasynth_core) and need to be reported there.
