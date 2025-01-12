import { NextResponse } from "next/server";
import axios from "axios";
import { load } from "cheerio";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { link } = await req.json();

    if (!link) {
      return NextResponse.json(
        { error: "Missing 'link' in request body." },
        { status: 400 }
      );
    }

    // Fetch the HTML content of the product page
    const response = await axios.get(link);
    const html = response.data;

    // Parse HTML using Cheerio
    const $ = load(html);

    // Extract product descriptions
    const descriptionElements = $("div#prd_toptxt")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((text) => text);
    const descriptions = descriptionElements.join("\n");

    // Extract product images
    const imageUrls: string[] = [];
    $("img[ec-data-src]").each((_, el) => {
      const src = $(el).attr("ec-data-src");
      if (src) {
        imageUrls.push(src.startsWith("http") ? src : `https:${src}`);
      }
    });

    if (!descriptions || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "Failed to extract product details or images." },
        { status: 400 }
      );
    }

    // Use GPT to generate reviews
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant who generates product reviews. Please give result in Korean" },
        {
          role: "user",
          content: `Here are the details of the product:\nDescriptions: ${descriptions}\nImages: ${imageUrls.join(
            ", "
          )}\n\nWrite three friendly, casual and detailed reviews of this product.`,
        },
      ],
    });

    const review = completion.choices[0].message.content;

    return NextResponse.json({ descriptions, imageUrls, review });
  } catch (error) {
    console.error("Error in API route:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
