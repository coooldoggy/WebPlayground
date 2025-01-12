import { NextResponse } from "next/server";
import axios from "axios";
import { load } from "cheerio";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is missing in environment variables." },
        { status: 500 }
      );
    }

    const { link } = await req.json();

    if (!link) {
      return NextResponse.json(
        { error: "Missing 'link' in request body." },
        { status: 400 }
      );
    }

    const urlRegex = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i;
    if (!urlRegex.test(link)) {
      return NextResponse.json(
        { error: "Invalid 'link' URL provided." },
        { status: 400 }
      );
    }

    // Fetch the HTML content of the product page
    let html;
    try {
      const response = await axios.get(link, { timeout: 10000 });
      html = response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Axios error:", error.response?.data || error.message);
        return NextResponse.json(
          { error: `Failed to fetch the product page: ${error.message}` },
          { status: 500 }
        );
      }
      throw error;
    }

    // Parse HTML using Cheerio
    const $ = load(html);

    const descriptionElements = $("div#prd_toptxt")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((text) => text);
    const descriptions = descriptionElements.join("\n");

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
    let review;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4", // Ensure a valid model name
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

      review = completion.choices[0].message.content;
    } catch (error) {
      console.error("OpenAI API error:", error);
      return NextResponse.json(
        { error: "Failed to generate reviews using OpenAI." },
        { status: 500 }
      );
    }

    return NextResponse.json({ descriptions, imageUrls, review });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
