// Shared design tokens for the cream/red palette rollout.
// Kept as plain values (not Tailwind config colors) since the app still has
// pages on the old light-blue token set — this avoids a global remap that
// would silently reflow unrelated pages.

export const COLOR = {
  bg: '#F5F0E8',
  card: '#FDFAF4',
  primary: '#A8192E',
  primaryHover: '#8f1526',
  text: '#1C1C1C',
  textAlt: '#2C1A0E',
}

// Hard offset "sticker" shadow — the neo-brutalist signature look, solid black.
export const OFFSET = 'shadow-[4px_4px_0_0_#1C1C1C]'
export const OFFSET_HOVER = 'hover:shadow-[5px_5px_0_0_#1C1C1C]'
export const OFFSET_SM = 'shadow-[3px_3px_0_0_#1C1C1C]'
// Buttons: press effect — shadow collapses and button shifts into it on interaction.
export const OFFSET_BTN = 'shadow-[3px_3px_0_0_#1C1C1C] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]'
