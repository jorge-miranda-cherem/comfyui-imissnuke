# ImissNuke brand

The mark is an N inside a Nuke pipe, a bracket with 45° bends. It has two outputs on the left and the slot dot on the right. There are two color versions:

| Version | Colors | Where it is used |
| --- | --- | --- |
| **Orange** (default) | orange `#E58A2E`, edge `#9C5517`, white `#FFFFFF`, ink `#141416` | the N in the top bar (orange mark on dark brown `#2a1d13` when on, grey when off), the Settings header, `../imissnuke-icon.png` |
| **Comfy Yellow** (Alt Comfy) | yellow `#F2FF59` on plum `#211927` | kept as an option. These are the Hotbox's colors, so the N and the H would look alike side by side in the bar. |

Type: Manrope ExtraBold 800 for the name, Manrope 500 for interface text.

Files:
- `svg/imissnuke-mark-*`: the bare mark in orange, white and black.
- `svg/imissnuke-chip-*`: the mark on a rounded chip.
- `svg/imissnuke-lockup-*`: mark plus name.
- `svg/imissnuke-comfy-classic-*`: the Comfy Yellow mark, chip and lockup.
- `png/`: the same marks and chips at 16, 32, 64, 128 and 512 px.

The top bar draws the mark inline from `IN_MARK` in `js/ImissNuke_Hotkeys.js`, a copy of `svg/imissnuke-mark-orange.svg` in `currentColor`. If the mark changes, update both.
