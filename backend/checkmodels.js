require('dotenv').config()

async function main() {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
  )
  const data = await res.json()
  console.log(JSON.stringify(data.models?.map(m => m.name), null, 2))
}

main()