import type { Config } from 'tailwindcss'
export default { content:['./app/**/*.tsx','./components/**/*.tsx'],
 theme:{extend:{colors:{ink:'#0A0A0A',coal:'#111111',ivory:'#F5F0E8',gold:'#C8A96B'},
 fontFamily:{serif:['var(--font-serif)','serif'],sans:['var(--font-sans)','sans-serif']}}}} satisfies Config
