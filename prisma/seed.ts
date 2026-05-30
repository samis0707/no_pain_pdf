import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
})

const prisma = new PrismaClient({ adapter })

const templates = [
  {
    name: 'Quartierszentrum Böckingen',
    category: 'event-flyer',
    html: '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <style>{{css}}</style>\n</head>\n<body>\n  <div class="flyer">\n    <header class="header">\n      <h1>{{title}}</h1>\n      <p class="subtitle">{{subtitle}}</p>\n    </header>\n    <div class="content">\n      <p class="intro">{{introduction}}</p>\n      <div class="events">\n        {{#each events}}\n        <div class="event">\n          <h3>{{title}}</h3>\n          <p class="date">{{date}}</p>\n          <p class="time">{{time}}</p>\n          <p class="location">{{location}}</p>\n          <p>{{description}}</p>\n        </div>\n        {{/each}}\n      </div>\n    </div>\n    <footer class="footer">\n      <p>{{contact}}</p>\n    </footer>\n  </div>\n</body>\n</html>',
    css: '* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: \'Helvetica Neue\', Arial, sans-serif; color: #1a1a1a; }\n.flyer { max-width: 210mm; margin: 0 auto; padding: 20mm; }\n.header { background: #1a365d; color: white; padding: 20mm; text-align: center; margin: -20mm -20mm 10mm; }\n.header h1 { font-size: 28pt; margin-bottom: 4pt; }\n.subtitle { font-size: 14pt; opacity: 0.9; }\n.events { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8mm; margin: 10mm 0; }\n.event { border: 1px solid #e2e8f0; padding: 5mm; border-radius: 2mm; }\n.event h3 { font-size: 14pt; margin-bottom: 3mm; color: #1a365d; }\n.date, .time, .location { font-size: 10pt; color: #666; margin-bottom: 1mm; }\n.footer { border-top: 1px solid #e2e8f0; padding-top: 5mm; margin-top: 10mm; text-align: center; font-size: 10pt; color: #666; }',
  },
  {
    name: 'Sportpark × linqr Kooperationsflyer',
    category: 'cooperation',
    html: '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <style>{{css}}</style>\n</head>\n<body>\n  <div class="flyer">\n    <div class="header">\n      <h1>{{title}}</h1>\n      <p class="tagline">{{tagline}}</p>\n    </div>\n    <div class="partners">\n      <div class="partner">\n        <h2>{{partner_a_name}}</h2>\n        <p>{{partner_a_desc}}</p>\n      </div>\n      <div class="divider">\n        <span>×</span>\n      </div>\n      <div class="partner">\n        <h2>{{partner_b_name}}</h2>\n        <p>{{partner_b_desc}}</p>\n      </div>\n    </div>\n    <div class="offer">\n      <h3>{{offer_title}}</h3>\n      <p>{{offer_description}}</p>\n      <p class="price">{{price}}</p>\n    </div>\n    <div class="cta">\n      <p>{{cta_text}}</p>\n      <p class="contact">{{contact}}</p>\n    </div>\n  </div>\n</body>\n</html>',
    css: '* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: \'Helvetica Neue\', Arial, sans-serif; color: #1a1a1a; }\n.flyer { max-width: 210mm; margin: 0 auto; padding: 15mm; }\n.header { text-align: center; margin-bottom: 15mm; }\n.header h1 { font-size: 32pt; color: #2d3748; margin-bottom: 4pt; }\n.tagline { font-size: 14pt; color: #718096; }\n.partners { display: flex; align-items: center; gap: 10mm; margin: 15mm 0; justify-content: center; }\n.partner { flex: 1; text-align: center; padding: 5mm; }\n.partner h2 { font-size: 20pt; color: #2b6cb0; margin-bottom: 3mm; }\n.divider { font-size: 36pt; color: #e53e3e; font-weight: bold; }\n.offer { background: #f7fafc; padding: 10mm; border-radius: 3mm; margin: 10mm 0; text-align: center; }\n.offer h3 { font-size: 18pt; margin-bottom: 3mm; }\n.price { font-size: 24pt; font-weight: bold; color: #e53e3e; margin-top: 5mm; }\n.cta { text-align: center; margin-top: 10mm; }\n.contact { font-size: 12pt; color: #2b6cb0; margin-top: 3mm; }',
  },
  {
    name: 'linqr Allgemein',
    category: 'general',
    html: '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <style>{{css}}</style>\n</head>\n<body>\n  <div class="flyer">\n    <header class="header">\n      <h1>{{publication_name}}</h1>\n      <p class="edition">{{edition}} | {{date}}</p>\n    </header>\n    <div class="main-story">\n      <h2>{{headline}}</h2>\n      <p class="summary">{{summary}}</p>\n      <p>{{body}}</p>\n    </div>\n    <div class="articles">\n      {{#each articles}}\n      <div class="article">\n        <h3>{{title}}</h3>\n        <p>{{snippet}}</p>\n      </div>\n      {{/each}}\n    </div>\n    <footer class="footer">\n      <p>{{footer_text}}</p>\n    </footer>\n  </div>\n</body>\n</html>',
    css: '* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: Georgia, \'Times New Roman\', serif; color: #1a1a1a; }\n.flyer { max-width: 210mm; margin: 0 auto; padding: 15mm; }\n.header { border-bottom: 3px solid #1a365d; padding-bottom: 5mm; margin-bottom: 8mm; }\n.header h1 { font-size: 36pt; color: #1a365d; letter-spacing: -0.5pt; }\n.edition { font-size: 10pt; color: #718096; text-transform: uppercase; margin-top: 2mm; }\n.main-story { margin-bottom: 10mm; }\n.main-story h2 { font-size: 22pt; margin-bottom: 4mm; }\n.summary { font-size: 12pt; font-style: italic; color: #4a5568; margin-bottom: 3mm; line-height: 1.6; }\n.articles { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin: 10mm 0; }\n.article { border-top: 1px solid #e2e8f0; padding-top: 3mm; }\n.article h3 { font-size: 14pt; color: #2d3748; margin-bottom: 2mm; }\n.footer { border-top: 1px solid #e2e8f0; padding-top: 5mm; text-align: center; font-size: 9pt; color: #a0aec0; }',
  },
]

async function main() {
  console.log('Seeding preset templates...')

  for (const template of templates) {
    const existing = await prisma.printTemplate.findFirst({
      where: { name: template.name },
    })
    if (existing) {
      await prisma.printTemplate.update({
        where: { id: existing.id },
        data: {
          ...template,
          metadata: JSON.stringify({
            thumbnail: null,
            description: `${template.name} preset template`,
            tags: [template.category, 'preset'],
          }),
        },
      })
    } else {
      await prisma.printTemplate.create({
        data: {
          ...template,
          metadata: JSON.stringify({
            thumbnail: null,
            description: `${template.name} preset template`,
            tags: [template.category, 'preset'],
          }),
        },
      })
    }
    console.log(`  ✓ ${template.name}`)
  }

  console.log('Seeding complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
