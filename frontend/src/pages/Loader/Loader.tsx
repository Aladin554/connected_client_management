import React from "react";

interface LoaderProps {
  message?: string;
}

const Loader: React.FC<LoaderProps> = ({ message = "Loading..." }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden
      bg-gradient-to-br from-gray-50 via-white to-gray-100">

      {/* === Soft background glows === */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 left-1/3 w-[700px] h-[700px] bg-sky-400/10 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* === Loader content === */}
      <div className="relative z-10 flex flex-col items-center gap-8 text-gray-800">

        {/* Spinner */}
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping" />
          <div className="w-24 h-24 rounded-full border-4 border-blue-300/40 border-t-blue-600 animate-spin" />

          {/* Center logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-3xl">C</span>
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="text-center">
          <h2 className="text-xl font-semibold">
            {message}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Please wait a moment…
          </p>
        </div>

        {/* Dots */}
        <div className="flex gap-2">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
};

export default Loader;
