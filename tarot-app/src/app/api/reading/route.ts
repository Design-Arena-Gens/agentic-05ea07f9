import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { SPREAD_CATEGORIES } from "../../../data/spreads";

const openaiClient =
  process.env.OPENAI_API_KEY != null
    ? new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
    : null;

type ReadingRequest = {
  categoryId: string;
  spread: {
    name: string;
    position: string;
    isReversed: boolean;
    keywords: string[];
    upright: string;
    reversed: string;
  }[];
};

export async function POST(req: NextRequest) {
  if (!openaiClient) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Add it to your Vercel project or .env.local file.",
      },
      { status: 500 },
    );
  }

  let body: ReadingRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const category = SPREAD_CATEGORIES.find(
    (item) => item.id === body.categoryId,
  );

  if (!category) {
    return NextResponse.json(
      { error: "Unknown spread category." },
      { status: 400 },
    );
  }

  const spreadSynopsis = body.spread
    .map((card, index) => {
      const label = `${index + 1}. ${card.position}: ${card.name} (${
        card.isReversed ? "reversed" : "upright"
      })`;
      const lens = card.isReversed ? card.reversed : card.upright;
      return `${label}. Essence: ${lens}. Keywords: ${card.keywords.join(", ")}`;
    })
    .join("\n");

  try {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: [
            "You are the Keeper of the KKRT Tarot, a lyrical mystic and practical guide.",
            "Deliver modern, empowering tarot readings tying symbolism to mindful action.",
            "Use evocative yet accessible language, weaving in sensory imagery.",
            "Structure your response as JSON with the following shape:",
            '{ \"headline\": string, \"overview\": string, \"cardInsights\": [{ \"card\": string, \"position\": string, \"insight\": string }], \"integration\": string, \"affirmation\": string }.',
            "Keep each field under 120 words. Avoid markdown code fences.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `Spread category: ${category.label}.`,
            `Category intention: ${category.description}`,
            `Reading angle: ${category.prompt}`,
            "Spread summary:",
            spreadSynopsis,
          ].join("\n"),
        },
      ],
    });

    const textOutput = response.choices[0]?.message?.content?.trim();

    if (!textOutput) {
      throw new Error("No reading text returned by OpenAI.");
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(textOutput);
    } catch {
      throw new Error("Reading output was not valid JSON.");
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Tarot reading request failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate reading.",
      },
      { status: 500 },
    );
  }
}
