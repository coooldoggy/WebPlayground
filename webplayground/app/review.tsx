"use client";

import { useState } from "react";

const GenerateReview: React.FC = () => {
  const [link, setLink] = useState("");
  const [reviews, setReviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFetchReviews = async () => {
    setError("");
    setReviews([]);

    if (!link) {
      setError("Please provide a valid product link.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ link }),
      });

      if (!response.ok) {
        const errorDetails = await response.json();
        setError(errorDetails.error || "Failed to fetch product reviews.");
        return;
      }

      const data = await response.json();
      // Parse reviews if they're in a single string
      if (typeof data.review === "string") {
        const parsedReviews = data.review.split("---").map((review) => review.trim());
        setReviews(parsedReviews);
      } else {
        setError("Unexpected response format.");
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-md">
      <input
        type="text"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="Enter product link"
        className="border border-gray-300 p-3 rounded-md w-full"
      />
      <button
        onClick={handleFetchReviews}
        className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "일하는 중..." : "생성하기"}
      </button>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {reviews.length > 0 && (
        <div className="mt-6 bg-gray-100 p-4 rounded-md shadow-md w-full">
          <h2 className="text-xl font-semibold mb-4">리뷰 생성 결과</h2>
          {reviews.map((review, index) => (
            <div
              key={index}
              className="border border-gray-300 p-4 mb-4 rounded-md"
            >
              <h3 className="text-lg font-bold mb-2">{`Review ${index + 1}`}</h3>
              <p>{review}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GenerateReview;
