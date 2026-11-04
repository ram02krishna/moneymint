import ThemeToggle from "../ui/ThemeToggle";
import AuthBranding from "../layouts/AuthBranding";

// Shared frame for every auth page: branding panel, theme toggle, heading and footer slot.
const AuthLayout = ({ title, subtitle, children, footer }) => {
  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-900">
      <AuthBranding />
      <main className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md space-y-6 animate-fade-up">
          <div className="flex justify-end">
            <ThemeToggle />
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {subtitle && <p className="mt-2 text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>

          {children}

          {footer && <p className="text-center text-sm text-gray-500 dark:text-gray-400">{footer}</p>}
        </div>
      </main>
    </div>
  );
};

export default AuthLayout;
