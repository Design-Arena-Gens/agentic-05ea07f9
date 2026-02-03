## KKRT Tarot Weaver

KKRT Tarot Weaver is a modern Next.js experience for drawing animated tarot spreads with AI-guided storytelling. Pick a thematic spread, watch the deck shuffle to life, and listen to a narrated interpretation generated from OpenAI.

### 1. Prerequisites

- Node.js 18.18+ or 20+
- npm (bundled with Node.js)
- An OpenAI API key with access to the `gpt-4.1-mini` model (or adjust in `src/app/api/reading/route.ts`)

### 2. Environment Variables

Create an `.env.local` file at the project root:

```bash
OPENAI_API_KEY=your_openai_key_here
```

When deploying on Vercel, add the same key under **Project Settings → Environment Variables**.

### 3. Development

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to explore the app.

### 4. Production Build

```bash
npm run build
npm start
```

### 5. Features

- Spread categories with curated card positions and prompts
- Animated shuffle and reveal using Framer Motion
- Voice narration via the Web Speech API (toggleable)
- Serverless API route that feeds KKRT card data into OpenAI for bespoke readings
- Theme palette selector for multiple ambient aesthetics

### 6. Deployment

This project is optimized for Vercel:

```bash
vercel deploy --prod --token $VERCEL_TOKEN --name agentic-05ea07f9
```

After deployment, confirm the production URL responds:

```bash
curl https://agentic-05ea07f9.vercel.app
```

### 7. Customization

- Modify spreads and prompts in `src/data/spreads.ts`
- Extend or adjust the KKRT deck in `src/data/kkrtDeck.ts`
- Tune animation and layout in `src/app/page.tsx`
- Swap colorways in `src/data/themes.ts`
