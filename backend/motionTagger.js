const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

const THEMES = [
  'philosophy', 'education', 'religion', 'economics', 'politics',
  'international relations', 'criminal justice', 'environment', 'technology',
  'gender', 'healthcare', 'media', 'sports', 'culture', 'fantasy', 'actor',
  'love', 'history', 'science', 'social justice'
]

function detectMotionType(text) {
  if (!text) return null
  const t = text.toLowerCase().trim()
  if (t.startsWith('thbt') || t.startsWith('this house believes that')) return 'THBT'
  if (t.startsWith('thw') || t.startsWith('this house would')) return 'THW'
  if (t.startsWith('ths ') || t.startsWith('this house supports')) return 'THS'
  if (t.startsWith('thr') || t.startsWith('this house regrets')) return 'THR'
  if (t.startsWith('thp') || t.startsWith('this house prefers')) return 'THP'
  if (t.startsWith('tho') || t.startsWith('this house opposes')) return 'THO'
  if (t.startsWith('tha') || t.startsWith('this house, as') || t.startsWith('this house as') || t.startsWith('th, as') || t.startsWith('in ')) return 'THA'
  if (t.startsWith('th ') || t.startsWith('this house ')) return 'TH'
  return null
}

async function classifyAllThemes(motions) {
  const prompt = `You are a debate motion classifier. I will give you a list of debate motions numbered 1 to ${motions.length}.

For each motion, assign 1-3 themes from this list ONLY:
${THEMES.join(', ')}

Return ONLY a JSON array of arrays, one inner array per motion, in the same order.
Example for 3 motions: [["economics","politics"],["education"],["gender","social justice"]]
No explanation, no markdown, just the raw JSON array.

Motions:
${motions.map((m, i) => `${i + 1}. ${m}`).join('\n')}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 8192 }
        })
      }
    )
    console.log('STATUS:', res.status)
    const text = await res.text()
    console.log('RAW TEXT:', text.slice(0, 500))
    const data = JSON.parse(text)
    if (data.error) {
      console.error('Gemini error:', data.error.message)
      return null
    }
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    console.log('CONTENT:', content?.slice(0, 300))
    const cleaned = content?.replace(/```json|```/g, '').trim()
    const result = JSON.parse(cleaned)
    if (!Array.isArray(result)) return null
    return result.map(arr =>
      Array.isArray(arr) ? arr.filter(t => THEMES.includes(t)) : []
    )
  } catch (e) {
    console.error('Gemini parse error:', e.message)
    return null
  }
}
async function tagAllMotions() {
  console.log('Starting motion tagging...')

  const { data: rounds, error } = await supabase
    .from('rounds')
    .select('id, tournament_id, motion, info_slide, motions')
    .not('motion', 'is', null)

  if (error) { console.error(error); return }
  console.log(`Found ${rounds.length} rounds with motions`)

  const allMotions = []
  for (const round of rounds) {
    if (Array.isArray(round.motions) && round.motions.length > 0) {
      round.motions.forEach(m => {
        if (m.title) allMotions.push({
          round_id: round.id,
          tournament_id: round.tournament_id,
          text: m.title,
          info_slide: m.info_slide || null
        })
      })
    } else if (round.motion) {
      allMotions.push({
        round_id: round.id,
        tournament_id: round.tournament_id,
        text: round.motion,
        info_slide: round.info_slide || null
      })
    }
  }

  console.log(`Total motions to tag: ${allMotions.length}`)

  // Split into batches of 30
  const BATCH_SIZE = 20
  const allThemes = []

  for (let i = 0; i < allMotions.length; i += BATCH_SIZE) {
    const batch = allMotions.slice(i, i + BATCH_SIZE)
    console.log(`Tagging batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(allMotions.length/BATCH_SIZE)}...`)
    const themes = await classifyAllThemes(batch.map(m => m.text))
    if (themes) {
      allThemes.push(...themes)
    } else {
      // push empty arrays for failed batch
      allThemes.push(...batch.map(() => []))
    }
    // small delay between batches
    if (i + BATCH_SIZE < allMotions.length) {
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  const rows = allMotions.map((m, i) => ({
    round_id: m.round_id,
    tournament_id: m.tournament_id,
    motion_text: m.text,
    info_slide: m.info_slide,
    motion_type: detectMotionType(m.text),
    themes: allThemes[i] || [],
  }))

  const { error: insertError } = await supabase
    .from('motion_tags')
    .insert(rows)

  if (insertError) {
    console.error('Insert error:', insertError.message)
    return
  }

  rows.forEach(r => {
    console.log(`✓ [${r.motion_type}] [${r.themes.join(', ')}] ${r.motion_text.slice(0, 60)}`)
  })

  console.log(`\n✓ Done. Tagged ${rows.length} motions.`)
}

tagAllMotions()