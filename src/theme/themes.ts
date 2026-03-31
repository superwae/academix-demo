export type ThemeId = 'light' | 'dark' | 'purple' | 'sky' | 'sky-purple' | 'green' | 'orange' | 'red' | 'pink' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'custom'

export const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'purple', label: 'Purple' },
  { id: 'sky', label: 'Sky Blue' },
  { id: 'sky-purple', label: 'Sky & Purple' },
  { id: 'green', label: 'Green' },
  { id: 'emerald', label: 'Emerald' },
  { id: 'orange', label: 'Orange' },
  { id: 'amber', label: 'Amber' },
  { id: 'red', label: 'Red' },
  { id: 'rose', label: 'Rose' },
  { id: 'pink', label: 'Pink' },
  { id: 'indigo', label: 'Indigo' },
  { id: 'custom', label: 'Custom' },
]

/** Mix (gradient) theme: two colors for background gradient. */
export type MixThemeId = 'red-blue' | 'white-black' | 'sky-purple' | 'black-gold'

export const MIX_THEMES: { id: MixThemeId; label: string; color1: string; color2: string }[] = [
  { id: 'red-blue', label: 'Red & Blue', color1: 'hsl(355 78% 90%)', color2: 'hsl(220 78% 90%)' },
  { id: 'white-black', label: 'White & Black', color1: 'hsl(0 0% 98%)', color2: 'hsl(0 0% 10%)' },
  { id: 'sky-purple', label: 'Sky Blue & Purple', color1: 'hsl(198 72% 88%)', color2: 'hsl(272 58% 88%)' },
  { id: 'black-gold', label: 'Black & Gold', color1: 'hsl(0 0% 5%)', color2: 'hsl(42 58% 50%)' },
]



