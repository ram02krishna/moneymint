import { Link } from "react-router-dom";
import { LuCompass } from "react-icons/lu";

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
    <div className="card max-w-md w-full text-center animate-fade-up">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-3xl mb-4">
        <LuCompass />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Page not found</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link to="/dashboard" className="btn-primary mt-6 inline-block">
        Back to dashboard
      </Link>
    </div>
  </div>
);

export default NotFound;
