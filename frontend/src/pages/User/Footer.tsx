// E:\connectedreact\connected\frontend\src\pages\User\Footer.tsx
export default function Footer() {
  return (
    <footer className="py-6 mt-10 border-t border-white/20">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-3">
          <a href="#" className="text-sm font-medium underline hover:text-gray-300 transition">
            Terms &amp; Conditions
          </a>
          <span className="hidden sm:inline">|</span>
          <a href="#" className="text-sm font-medium underline hover:text-gray-300 transition">
            Privacy Policy
          </a>
        </div>
        <div className="text-sm text-gray-400">© 2025. All rights reserved.</div>
      </div>
    </footer>
  );
}
