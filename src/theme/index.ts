import { useColorScheme } from 'react-native';

const light = {
  background: '#F6F4EE',
  card: '#FFFFFF',
  text: '#1F2A24',
  muted: '#5E6B63',
  border: '#E1DDD2',
  primary: '#2F5D3A',
  primaryText: '#FFFFFF',
  accent: '#B8742A',
  danger: '#B3261E',
  caution: '#B8742A',
  info: '#2F6690',
  closure: '#6B3FA0',
  // Selected map pin and the state label on the Discover card.
  highlight: '#C0714F',
  // Floating panels over the map.
  surface: '#FFFDF8',
};

const dark: typeof light = {
  background: '#121614',
  card: '#1C221F',
  text: '#ECEFEA',
  muted: '#9AA69F',
  border: '#2C3530',
  primary: '#7FB38B',
  primaryText: '#0F1511',
  accent: '#E0A15C',
  danger: '#F2887F',
  caution: '#E0A15C',
  info: '#7DB3DB',
  closure: '#B79BE0',
  highlight: '#E3906E',
  surface: '#1C221F',
};

export type Palette = typeof light;

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export function alertColor(palette: Palette, category: string): string {
  switch (category) {
    case 'Danger':
      return palette.danger;
    case 'Caution':
      return palette.caution;
    case 'Park Closure':
      return palette.closure;
    default:
      return palette.info;
  }
}

export const US_STATES: { code: string; name: string }[] = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AS', 'American Samoa'], ['AZ', 'Arizona'], ['AR', 'Arkansas'],
  ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'],
  ['FL', 'Florida'], ['GA', 'Georgia'], ['GU', 'Guam'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'],
  ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
  ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'],
  ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'],
  ['MP', 'Northern Mariana Islands'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'],
  ['PR', 'Puerto Rico'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'],
  ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VI', 'Virgin Islands'], ['VA', 'Virginia'],
  ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
].map(([code, name]) => ({ code, name }));
