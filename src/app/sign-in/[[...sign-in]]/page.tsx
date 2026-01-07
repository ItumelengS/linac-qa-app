import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">SASQART QA System</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg",
            },
          }}
        />
        <p className="text-center text-sm text-gray-500 mt-4">
          SASQART compliant QA management for radiation oncology
        </p>
      </div>
    </div>
  );
}
