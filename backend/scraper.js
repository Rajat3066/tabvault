const puppeteer = require('puppeteer')
const db = require('./db')

function parseUrl(rawUrl) {
  const url = new URL(rawUrl)
  const subdomain = url.hostname.split('.')[0]
  // pathname is like /pratijjav21/ — remove slashes
  const slug = url.pathname.replace(/\//g, '').trim()
  return { subdomain, slug }
}

function baseUrl(subdomain, slug) {
  return `https://${subdomain}.calicotab.com/${slug}`
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function visitPage(browser, url, waitFor = null) {
  const page = await browser.newPage()
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
  )
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    if (waitFor) {
      await page.waitForSelector(waitFor, { timeout: 10000 }).catch(() => {})
    }
    await delay(1500)
    return page
  } catch (err) {
    await page.close()
    return null
  }
}

async function extractTable(page, selector = 'table') {
  return await page.evaluate((sel) => {
    const table = document.querySelector(sel)
    if (!table) return null

    const headers = [...table.querySelectorAll('thead th')].map(th => th.innerText.trim())

    return [...table.querySelectorAll('tbody tr')].map(row => {
      const cells = [...row.querySelectorAll('td')].map(td => {
        const html = td.innerHTML
        const text = td.innerText.trim()

        function isVisible(el) {
        const style = window.getComputedStyle(el)
        const rect = el.getBoundingClientRect()

        return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            rect.width > 0 &&
            rect.height > 0
        )
        }

        function getRoundResult(td) {
        const icons = [...td.querySelectorAll('i, svg, span')]
            .filter(isVisible)
            .map(el => {
            const cls = String(el.className?.baseVal || el.className || '').toLowerCase()
            const label = String(el.getAttribute('aria-label') || el.getAttribute('title') || '').toLowerCase()
            const text = String(el.textContent || '').trim().toLowerCase()

            return `${cls} ${label} ${text}`
            })

        for (const icon of icons) {
            if (
            icon.includes('chevron-up') ||
            icon.includes('arrow-up') ||
            icon.includes('fa-angle-up') ||
            icon.includes('caret-up') ||
            icon.includes('text-success') ||
            icon.includes('text-green')
            ) {
            return 'win'
            }

            if (
            icon.includes('chevron-down') ||
            icon.includes('arrow-down') ||
            icon.includes('fa-angle-down') ||
            icon.includes('caret-down') ||
            icon.includes('text-danger') ||
            icon.includes('text-red')
            ) {
            return 'loss'
            }
        }

        return null
        }

        return {
        text,
        result: getRoundResult(td),
        }
      })

      const obj = {
        __headers: headers,
        __cells: cells,
      }

      headers.forEach((h, i) => {
        if (h) obj[h] = cells[i]?.text ?? null
      })

      cells.forEach((cell, i) => {
        obj[`_${i}`] = cell.text
      })

      return obj
    })
  }, selector)
}

function getIndexedValues(row) {
  return Object.keys(row)
    .filter(k => /^_\d+$/.test(k))
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
    .map(k => row[k])
}

function cleanName(raw) {
  if (!raw) return null

  const text = typeof raw === 'string'
    ? raw
    : raw.text || ''

  if (!text) return null
  return text.split('\n').pop().trim() || text.trim()
}

function toFloat(val) {
  if (val === null || val === undefined || val === '' || val === '—') return null

  const text = typeof val === 'string'
    ? val
    : val.text || ''

  const cleaned = text.replace(/[^0-9.-]/g, '')
  if (!cleaned || cleaned === '-' || cleaned === '.') return null

  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function toInt(val) {
  if (val === null || val === undefined || val === '') return null

  const text = typeof val === 'string'
    ? val
    : val.text || ''

  const cleaned = text.replace(/[^0-9-]/g, '')
  if (!cleaned || cleaned === '-') return null

  const n = parseInt(cleaned, 10)
  return isNaN(n) ? null : n
}

async function scrapeTournament(rawUrl) {
  const { subdomain, slug } = parseUrl(rawUrl)
  const base = baseUrl(subdomain, slug)

  const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 
    '/opt/render/.cache/puppeteer/chrome/linux-149.0.7827.22/chrome-linux64/chrome',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
  ],
})

  let tournament = null
  let tid = null
  const publicPages = {}

  try {
    // ── 1. Welcome page ────────────────────────────────────────────────────────
    console.log(`Scraping welcome page: ${base}`)
    const homePage = await visitPage(browser, base)
    if (!homePage) throw new Error(`Could not load tournament page: ${rawUrl}`)

    const welcomeText = await homePage.evaluate(() => {
      const main = document.querySelector('.card-body, main, #content, .container')
      return main ? main.innerText.trim().slice(0, 2000) : ''
    })

    const tournamentName = await homePage.evaluate(() => {
      const el = document.querySelector('h1, .navbar-brand, #pageTitle h2')
      return el ? el.innerText.trim() : document.title.replace('Tabbycat |', '').trim()
    })

    // ── 2. Discover nav links ──────────────────────────────────────────────────
    const navLinks = await homePage.evaluate((base) => {
      const links = [...document.querySelectorAll('nav a, .navbar a, .nav-link, .dropdown-item')]
      return links
        .map(a => ({ text: a.innerText.trim(), href: a.href }))
        .filter(l => l.href && l.href.startsWith(base) && l.text && l.href !== base + '/')
    }, base)

    await homePage.close()
    console.log('Nav links found:', navLinks.map(l => `${l.text} → ${l.href}`))

    // ── 3. Insert tournament row ───────────────────────────────────────────────
    tournament = await db.insertTournament({
      slug,
      name: tournamentName || slug,
      format: null,
      institution: null,
      date: null,
      original_url: rawUrl,
      scrape_status: 'pending',
      public_pages: {},
      welcome_text: welcomeText,
    })
    tid = tournament.id

    // ── 4. Scrape each discovered page ─────────────────────────────────────────
    for (const link of navLinks) {
      await delay(1200)
      const text = link.text.toLowerCase()
      const url  = link.href
      console.log(`Processing: "${link.text}" → ${url}`)

      // ── Team Tab (open) ──────────────────────────────────────────────────────
      // Headers: ["", "", "", "R1","R2",...,"Wins","Spk","AWM"]
      // Row:     [rank, "emoji\nTeamName", institution, ...round scores, wins, spk, awm]
      if (
        (text.includes('team') && text.includes('tab')) ||
        (text.includes('team') && !text.includes('novice') && url.includes('/tab/team/') && !url.includes('novice'))
      ) {
        const page = await visitPage(browser, url, 'table tbody tr')
        if (page) {
          const rows = await extractTable(page)
          if (rows && rows.length > 0) {
            publicPages.teams = true
            const teams = rows.map(r => {
            const vals = getIndexedValues(r)
            const headers = r.__headers || []

            return {
                tournament_id: tid,
                rank: toInt(vals[0]),
                name: cleanName(vals[1]),
                institution: vals[2] || null,
                categories: [],
                points: toFloat(r['Wins'] ?? vals[vals.length - 3]),
                speaks: toFloat(r['Spk'] ?? vals[vals.length - 2]),
                awm: toFloat(r['AWM'] ?? vals[vals.length - 1]),
                tab_columns: headers,
                tab_cells: vals,
                tab_cells_meta: r.__cells || [],
            }
            }).filter(t => t.name)
            await db.insertTeams(teams)
            console.log(`  ✓ Teams: ${teams.length}`)
          }
          await page.close()
        }
      }

      // ── Novice Teams ─────────────────────────────────────────────────────────
      else if (text.includes('novice') && text.includes('team')) {
        const page = await visitPage(browser, url, 'table tbody tr')
        if (page) {
          const rows = await extractTable(page)
          if (rows && rows.length > 0) {
            publicPages.noviceTeams = true
            const teams = rows.map(r => {
            const vals = getIndexedValues(r)
            const headers = r.__headers || []

            return {
                tournament_id: tid,
                rank: toInt(vals[0]),
                name: cleanName(vals[1]),
                institution: vals[2] || null,
                categories: ['novice'],
                points: toFloat(r['Wins'] ?? vals[vals.length - 3]),
                speaks: toFloat(r['Spk'] ?? vals[vals.length - 2]),
                awm: toFloat(r['AWM'] ?? vals[vals.length - 1]),
                tab_columns: headers,
                tab_cells: vals,
                tab_cells_meta: r.__cells || [],
            }
            }).filter(t => t.name)
            // upsert — team may already exist from open tab; skip duplicates
            // Update categories on existing teams to add 'novice'
            const existingTeams = await db.getTeams(tid)
            const existingNames = new Map(existingTeams.map(t => [t.name, t]))
            for (const team of teams) {
            const existing = existingNames.get(team.name)
            if (existing) {
                await db.updateTeamCategories(existing.id, ['novice'])
            } else {
                await db.insertTeams([team])
            }
            }
            console.log(`  ✓ Novice Teams: ${teams.length}`)
          }
          await page.close()
        }
      }

      // ── Speaker Tab (open or general) ────────────────────────────────────────
      // Headers: ["","","","","R1","R2",...,"Avg","Stdev","Num"]
      // Row:     [rank, name, categories, "emoji\nTeamName", r1, r2, ..., avg, stdev, num]
      else if (
        (text.includes('speaker') && text.includes('tab')) ||
        (text.includes('open') && text.includes('speaker')) ||
        (url.includes('/tab/speaker/open') || (url.includes('/tab/speaker/') && !url.includes('novice')))
      ) {
        const page = await visitPage(browser, url, 'table tbody tr')
        if (page) {
          const rows = await extractTable(page)
          if (rows && rows.length > 0) {
            publicPages.speakers = true
            const speakers = rows.map(r => {
            const vals = getIndexedValues(r)
            const headers = r.__headers || []
            const hasTotal = headers.some(h => h.toLowerCase() === 'total')

            const summaryStart = hasTotal ? vals.length - 4 : vals.length - 3

            return {
                tournament_id: tid,
                team_id: null,
                rank: toInt(vals[0]),
                name: vals[1] || null,
                categories: (vals[2] || '').split(',').map(s => s.trim()).filter(Boolean),
                team_name: cleanName(vals[3]),
                institution: vals[4] || null,
                total_speaks: hasTotal ? toFloat(vals[summaryStart]) : null,
                avg_speaks: toFloat(hasTotal ? vals[summaryStart + 1] : vals[summaryStart]),
                stdev: toFloat(hasTotal ? vals[summaryStart + 2] : vals[summaryStart + 1]),
                num: toInt(hasTotal ? vals[summaryStart + 3] : vals[summaryStart + 2]),
                tab_columns: headers,
                tab_cells: vals,
            }
            }).filter(s => s.name)
            await db.insertSpeakers(speakers)
            console.log(`  ✓ Speakers: ${speakers.length}`)
          }
          await page.close()
        }
      }

      // ── Novice Speakers ───────────────────────────────────────────────────────
      else if (text.includes('novice') && text.includes('speaker')) {
        const page = await visitPage(browser, url, 'table tbody tr')
        if (page) {
          const rows = await extractTable(page)
          if (rows && rows.length > 0) {
            publicPages.noviceSpeakers = true
            const speakers = rows.map(r => {
            const vals = getIndexedValues(r)
            const headers = r.__headers || []
            const hasTotal = headers.some(h => h.toLowerCase() === 'total')

            const summaryStart = hasTotal ? vals.length - 4 : vals.length - 3

            return {
                tournament_id: tid,
                team_id: null,
                rank: toInt(vals[0]),
                name: vals[1] || null,
                categories: ['novice'],
                team_name: cleanName(vals[3]),
                institution: vals[4] || null,
                total_speaks: hasTotal ? toFloat(vals[summaryStart]) : null,
                avg_speaks: toFloat(hasTotal ? vals[summaryStart + 1] : vals[summaryStart]),
                stdev: toFloat(hasTotal ? vals[summaryStart + 2] : vals[summaryStart + 1]),
                num: toInt(hasTotal ? vals[summaryStart + 3] : vals[summaryStart + 2]),
                tab_columns: headers,
                tab_cells: vals,
            }
            }).filter(s => s.name)
            // skip duplicates already inserted from open tab
            // Update categories on existing speakers to add 'novice'
            const existing = await db.getSpeakers(tid)
            const existingMap = new Map(existing.map(s => [s.name, s]))
            for (const spk of speakers) {
            const existingSpk = existingMap.get(spk.name)
            if (existingSpk) {
                await db.updateSpeakerCategories(tid, spk.name, 'novice')
            } else {
                await db.insertSpeakers([spk])
            }
            }
            console.log(`  ✓ Novice Speakers: ${speakers.length}`)
          }
          await page.close()
        }
      }

      // ── Replies Tab ───────────────────────────────────────────────────────────
      // Same structure as speaker tab — categories may include "reply"
      else if (text.includes('repl')) {
        const page = await visitPage(browser, url, 'table tbody tr')
        if (page) {
          const rows = await extractTable(page)
          if (rows && rows.length > 0) {
            publicPages.replies = true
            const speakers = rows.map(r => ({
              tournament_id: tid,
              team_id: null,
              name: r['_1'] || null,
              categories: ['reply'],
              total_speaks: toFloat(r['Avg']),
              avg_speaks: toFloat(r['Avg']),
            })).filter(s => s.name)
            // replies are a subset — update existing speakers rather than insert duplicates
            // Insert reply speakers as separate rows — don't touch existing speaker rows
            const existing = await db.getSpeakers(tid)
            const existingReply = new Set(
            existing.filter(s => s.categories?.includes('reply')).map(s => s.name)
            )
            const newReplies = speakers.filter(s => !existingReply.has(s.name))
            if (newReplies.length > 0) {
            await db.insertSpeakers(newReplies)
            }
            console.log(`  ✓ Replies: ${speakers.length}`)
          }
          await page.close()
        }
      }

      // ── Motions ───────────────────────────────────────────────────────────────
      // Motions page renders cards/rows, not a standard table
       else if (text.includes('motion')) {
        const page = await visitPage(browser, url, '.list-group')
        if (page) {
            publicPages.motions = true

            const motionGroups = await page.evaluate(() => {
            const groups = []

            document.querySelectorAll('.list-group').forEach(group => {
                const badge = group.querySelector('.badge')
                if (!badge) return
                const roundName = badge.innerText.trim()
                const motions = []

                group.querySelectorAll('.list-group-item:not(.disabled)').forEach(item => {
                const h4 = item.querySelector('h4')
                if (!h4) return

                // Clean title — remove <small> nickname tag
                const h4clone = h4.cloneNode(true)
                h4clone.querySelectorAll('small').forEach(s => s.remove())
                const title = h4clone.innerText.replace(/\s+/g, ' ').trim()

                // Check for info slide button
                const infoBtn = item.querySelector('span[data-target], a[data-target]')
                let infoSlide = null
                if (infoBtn) {
                    const modalId = infoBtn.getAttribute('data-target')
                    const modal = document.querySelector(modalId)
                    if (modal) {
                    const body = modal.querySelector('.modal-body')
                    infoSlide = body ? body.innerText.replace(/\s+/g, ' ').trim() : null
                    }
                }

                if (title) motions.push({ title, info_slide: infoSlide })
                })

                if (motions.length > 0) groups.push({ roundName, motions })
            })

            return groups
            })

            console.log(`Found ${motionGroups.length} round groups`)

            if (motionGroups.length > 0) {
            let existingRounds = await db.getRounds(tid)

            for (const group of motionGroups) {
                // First try to match by name against existing rounds
                let matchedRound = existingRounds.find(r => 
                r.name.toLowerCase().trim() === group.roundName.toLowerCase().trim()
                )
                // If found by name, use its seq
                const roundSeq = matchedRound 
                ? matchedRound.seq 
                : (group.roundName.match(/\d+/) 
                    ? parseInt(group.roundName.match(/\d+/)[0]) 
                    : existingRounds.length + 1)
                const isBreak = /semi|final|quarter|break|octo/i.test(group.roundName)

                let round = matchedRound || existingRounds.find(r => r.seq === roundSeq)
                const fields = {
                name: group.roundName,
                is_break_round: isBreak,
                motion: group.motions[0]?.title || null,
                info_slide: group.motions[0]?.info_slide || null,
                motions: group.motions,
                }

                if (!round) {
                await db.insertRounds([{ tournament_id: tid, seq: roundSeq, ...fields }])
                existingRounds = await db.getRounds(tid)
                } else {
                await db.updateRound(round.id, fields)
                }
            }

            console.log(`  ✓ Motions: ${motionGroups.length} rounds`)
            }

            await page.close()
        }
}
      // ── Results per round ─────────────────────────────────────────────────────
      // URL: /results/round/1/, /results/round/2/, etc.
      // Headers: ["", "", "Side", "", "Adjudicators"]
      // Row:     [gov_team, opp_team, winner_side, "View Ballot", adjudicators_string]
      else if (url.includes('/results/round/')) {
        const seqMatch = url.match(/\/results\/round\/(\d+)/)
        if (!seqMatch) continue
        const seq = parseInt(seqMatch[1])

        // Derive round name from nav link text
        const roundName = link.text.trim()
        const isBreak = /semi|final|quarter|break/i.test(roundName)

        // Ensure round exists in DB
        let existingRounds = await db.getRounds(tid)
        // For break rounds always match by name since URL seq ≠ DB seq
        // For prelim rounds match by seq first
        let round = isBreak
        ? existingRounds.find(r => r.name.toLowerCase().trim() === roundName.toLowerCase().trim())
            || existingRounds.find(r => r.seq === seq)
        : existingRounds.find(r => r.seq === seq)
            || existingRounds.find(r => r.name.toLowerCase().trim() === roundName.toLowerCase().trim())
        if (!round) {
        await db.insertRounds([{
            tournament_id: tid,
            seq,
            name: roundName,
            is_break_round: isBreak,
            motion: null,
            info_slide: null,
          }])
          existingRounds = await db.getRounds(tid)
          round = existingRounds.find(r => r.seq === seq)
        }

        const page = await visitPage(browser, url, 'table tbody tr')
        if (page) {
          const rows = await extractTable(page)
          if (rows && rows.length > 0) {
            publicPages.results = true

            const pairings = rows.map(r => {
              // _0 = gov team "emoji\nName", _1 = opp team "vs emoji\nName"
              // _2 = winner side ("Government"/"Opposition"), _3 = "View Ballot"
              // _4 = adjudicators string
              const govRaw  = r['_0'] || ''
              const oppRaw  = r['_1'] || ''
              const side    = r['_2'] || r['Side'] || ''
              const adjsRaw = r['_4'] || r['Adjudicators'] || ''

              // opp cell shows "vs emoji\nName" — strip "vs" prefix
              const oppClean = oppRaw.replace(/^vs\s*/i, '')

              const govName = cleanName(govRaw)
              const oppName = cleanName(oppClean)

              // winner: "Government" → gov won, "Opposition" → opp won
              const winner = /gov/i.test(side) ? 'gov'
                           : /opp/i.test(side) ? 'opp'
                           : null

              // adjudicators: comma-separated, strip Ⓒ (chair) and 💢 (trainee) markers
              const adjList = adjsRaw
                .split(',')
                .map(a => a.replace(/[ⒸⒻ💢🔴🟡]/g, '').trim())
                .filter(Boolean)

              return {
                round_id: round.id,
                room: null,
                gov_team_name: govName,
                opp_team_name: oppName,
                side_raw: side,  
                winner,
                gov_speaks: null,
                opp_speaks: null,
                adjudicators: adjList,
              }
            }).filter(p => p.gov_team_name && p.opp_team_name && /gov/i.test(p.side_raw))

            // Resolve team IDs from names
            const allTeams = await db.getTeams(tid)
            const teamMap = new Map(allTeams.map(t => [t.name, t.id]))

            const pairingsToInsert = pairings.map(p => ({
              round_id: p.round_id,
              room: p.room,
              gov_team_id: teamMap.get(p.gov_team_name) || null,
              opp_team_id: teamMap.get(p.opp_team_name) || null,
              winner: p.winner,
              gov_speaks: p.gov_speaks,
              opp_speaks: p.opp_speaks,
              adjudicators: p.adjudicators,
            }))

            await db.insertPairings(pairingsToInsert)
            console.log(`  ✓ Round ${seq} (${roundName}) results: ${pairings.length} debates`)
          }
          await page.close()
        }
      }

      // ── Break — Teams (Open / Novice) ─────────────────────────────────────────
      // Headers: ["", "Break", "", "Wins", "Spk", "AWM"]
      // Row:     [rank, break_rank, "emoji\nTeamName", wins, spk, awm]
      else if (url.includes('/break/teams/')) {
        const page = await visitPage(browser, url, 'table tbody tr')
        if (page) {
          const rows = await extractTable(page)
          if (rows && rows.length > 0) {
            publicPages.breaks = true

            // Category name from URL: /break/teams/open/ → "Open"
            const catSlug = url.split('/break/teams/')[1].replace(/\//g, '')
            const catName = catSlug.charAt(0).toUpperCase() + catSlug.slice(1)

            const cats = await db.insertBreakCategories([{
              tournament_id: tid,
              name: catName,
              slug: catSlug,
            }])
            const catId = cats[0].id

            // Resolve team names to IDs
            const allTeams = await db.getTeams(tid)
            const teamMap = new Map(allTeams.map(t => [t.name, t.id]))

            const breakingTeams = rows.map((r, i) => {
              // _0=rank, _1=break_rank, _2="emoji\nTeamName"
              const name = cleanName(r['_2'])
              return {
                break_category_id: catId,
                team_id: teamMap.get(name) || null,
                rank: toInt(r['_0']) || i + 1,
              }
            })

            await db.insertBreakingTeams(breakingTeams)
            console.log(`  ✓ Break (${catName}): ${breakingTeams.length} teams`)
          }
          await page.close()
        }
      }

      // ── Break — Adjudicators ──────────────────────────────────────────────────
      // Headers: ["","","",""]
      // Row:     [name, institution, "", ""]
      else if (url.includes('/break/adjudicators/')) {
        const page = await visitPage(browser, url, 'table tbody tr')
        if (page) {
            
          const rows = await extractTable(page)
          console.log('BREAK ADJ RAW ROWS:', JSON.stringify(rows?.slice(0,3), null, 2))
          if (rows && rows.length > 0) {
            publicPages.breakAdjs = true
            const adjs = rows.map((r, i) => ({
              tournament_id: tid,
              name: r['_0'] || null,
              institution: r['_1'] || null,
              score: null,
              is_breaking: true,
            })).filter(a => a.name)
            await db.insertAdjudicators(adjs)
            console.log(`  ✓ Breaking Adjudicators: ${adjs.length}`)
          }
          await page.close()
        }
      }

      // ── Participants ──────────────────────────────────────────────────────────
      // Two tables:
      // Table 1 (institutions): ["","","",""] → [name, institution, "", ""]
      // Table 2 (speakers):     ["","",""]    → [name, categories, "emoji\nTeam"]
      else if (url.includes('/participants/')) {
        const page = await visitPage(browser, url, 'table tbody tr')
        if (page) {
          publicPages.participants = true

          const allTables = await page.evaluate(() => {
            return [...document.querySelectorAll('table')].map(table => {
              const headers = [...table.querySelectorAll('thead th')].map(th => th.innerText.trim())
              const rows = [...table.querySelectorAll('tbody tr')].map(row =>
                [...row.querySelectorAll('td')].map(td => td.innerText.trim())
              )
              return { headers, rows }
            })
          })

          // Table 0 = institutions/teams, Table 1 = speakers
          if (allTables.length >= 2) {
            // Table 0 = adjudicators
            const adjRows = allTables[0].rows
            const participantAdjs = adjRows.map(cells => ({
                tournament_id: tid,
                name: cells[0] || null,
                institution: cells[1] || null,
                score: null,
                is_breaking: false,
            })).filter(a => a.name && a.name.toLowerCase() !== 'redacted')

            const existingAdjs = await db.getAdjudicators(tid)
            const existingAdjNames = new Set(existingAdjs.map(a => a.name))
            const newAdjs = participantAdjs.filter(a => !existingAdjNames.has(a.name))
            if (newAdjs.length > 0) await db.insertAdjudicators(newAdjs)
            console.log(`  ✓ Participants: ${participantAdjs.length} adjudicators (${newAdjs.length} new)`)

            // Table 1 = speakers
            const speakerRows = allTables[1].rows
            const participantSpeakers = speakerRows.map(cells => ({
                tournament_id: tid,
                team_id: null,
                name: cells[0] || null,
                categories: (cells[1] || '').split(',').map(s => s.trim()).filter(Boolean),
                total_speaks: null,
                avg_speaks: null,
            })).filter(s => s.name && s.name.toLowerCase() !== 'redacted')

            const existing = await db.getSpeakers(tid)
            const existingNames = new Set(existing.map(s => s.name))
            const newSpk = participantSpeakers.filter(s => !existingNames.has(s.name))
            if (newSpk.length > 0) await db.insertSpeakers(newSpk)
            console.log(`  ✓ Participants: ${participantSpeakers.length} speakers (${newSpk.length} new)`)
            }

          await page.close()
        }
      }
    }

    // ── 5. Mark complete ───────────────────────────────────────────────────────
    await db.updateTournament(tid, {
      scrape_status: 'complete',
      public_pages: publicPages,
    })

    console.log(`\n✓ Scrape complete: ${slug}`)
    console.log('Pages scraped:', publicPages)
    return tournament

  } catch (err) {
    console.error(`\n✗ Scrape failed: ${slug}`, err.message)
    if (tournament) {
      await db.updateTournament(tournament.id, { scrape_status: 'failed' })
    }
    throw err
  } finally {
    await browser.close()
  }
}

module.exports = { scrapeTournament, parseUrl }