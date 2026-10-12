import sharp from 'sharp'

const svg = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0f172a"/>
  <circle cx="256" cy="256" r="150" fill="none" stroke="#ffffff" stroke-width="14"/>
  <polygon points="256,170 206,206 225,266 287,266 306,206" fill="#ffffff"/>
  <line x1="256" y1="106" x2="256" y2="170" stroke="#ffffff" stroke-width="10"/>
  <line x1="170" y1="206" x2="206" y2="206" stroke="#ffffff" stroke-width="10"/>
  <line x1="342" y1="206" x2="306" y2="206" stroke="#ffffff" stroke-width="10"/>
  <line x1="206" y1="320" x2="225" y2="266" stroke="#ffffff" stroke-width="10"/>
  <line x1="306" y1="320" x2="287" y2="266" stroke="#ffffff" stroke-width="10"/>
</svg>
`

await sharp(Buffer.from(svg)).resize(192, 192).png().toFile('public/icon-192.png')
await sharp(Buffer.from(svg)).resize(512, 512).png().toFile('public/icon-512.png')
await sharp(Buffer.from(svg)).resize(180, 180).png().toFile('public/apple-touch-icon.png')
console.log('Icons generated')
