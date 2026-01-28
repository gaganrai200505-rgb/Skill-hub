import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-64px)] grid place-items-center px-4">
      <div className="text-center">
        <div className="text-7xl font-black text-brand-600">404</div>
        <p className="mt-2 text-gray-600">This page does not exist.</p>
        <Link to="/" className="inline-block mt-6 bg-brand-600 text-white px-6 py-3 rounded-full hover:bg-brand-700">
          Go Home
        </Link>
      </div>
    </div>
  );
}
