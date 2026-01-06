import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          SASQART QA System
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Comprehensive quality assurance management for radiation oncology departments.
          SASQART compliant. Built for South African hospitals.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
