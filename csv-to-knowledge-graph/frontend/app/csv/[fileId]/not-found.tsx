"use client";

import Link from "next/link";
import { FileX } from "lucide-react";

export default function CSVNotFound() {
  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="bg-[#1c1c1c] p-8 rounded-lg border border-[#2a2a2a] shadow-sm max-w-md text-center">
        <div className="mx-auto w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mb-6">
          <FileX className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-4 text-white">
          CSV File Not Found
        </h1>
        <p className="text-gray-400 mb-6">
          The CSV file you're looking for doesn't exist or may have been
          removed.
        </p>
        <div className="flex flex-col space-y-3">
          <Link
            href="/"
            className="px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-600"
          >
            Upload New CSV
          </Link>
          <Link
            href="/csv"
            className="px-4 py-2 bg-[#333] text-gray-300 rounded-md hover:bg-[#444]"
          >
            View Available Files
          </Link>
        </div>
      </div>
    </div>
  );
}
