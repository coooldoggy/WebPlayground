import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { load } from "cheerio";
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OpenAI API key in environment variables.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { link } = await req.json();

    if (!link) {
      return NextResponse.json(
        { error: "Missing link in request body." },
        { status: 400 }
      );
    }

    // Validate the link
    try {
      new URL(link);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL provided." },
        { status: 400 }
      );
    }

    // Fetch the HTML content of the product page
    let html;
    try {
      const response = await axios.get(link);
      html = response.data;
    } catch (err) {
      console.error("Failed to fetch the product page:", err);
      return NextResponse.json(
        { error: "Failed to fetch the product page." },
        { status: 500 }
      );
    }

    const $ = load(html);

    // Extract Product Description
    const descriptionElements = $("div#prd_toptxt")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((text) => text);
    const descriptions = descriptionElements.length > 0
      ? descriptionElements.join("\n")
      : "No descriptions found.";

    // Extract Product Images
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

    // Use GPT to generate a review
    let review;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant who generates product reviews. Please give result in Korean" },
          {
            role: "user",
            content: `Here are the details of the product:\nDescriptions: ${descriptions}\nImages: ${imageUrls.join(
              ", "
            )}\n\nWrite three friendly and detailed reviews of this product.`,
          },
        ],
      });

      review = completion.choices[0].message.content;
    } catch (err: any) {
      if (err.response) {
        console.error("OpenAI API Error:", err.response.data);
        return NextResponse.json(
          { error: `OpenAI API error: ${err.response.data.error.message}` },
          { status: 500 }
        );
      }
      console.error("Failed to generate the review:", err);
      return NextResponse.json(
        { error: "Failed to generate the review due to an unexpected error." },
        { status: 500 }
      );
    }

    // Combine the response
    return NextResponse.json(
      { descriptions, imageUrls, review },
      { headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing the request." },
      { status: 500 }
    );
  }
}
