import React from 'react';

const Header = () => {
  return (
    <header className="bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm sticky top-0 z-50">
      <div className="px-4 sm:px-8 py-3 sm:py-4 flex justify-between items-center gap-3">

        {/* Left greeting section */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-sm sm:text-lg font-semibold truncate">
              Hey sai santhosh
            </span>
            <span className="text-xs text-slate-500 hidden sm:block">
              Welcome back – Strategy Dashboard
            </span>
          </div>
        </div>

        {/* Right profile / subscription section */}
        <div className="flex items-center gap-2 sm:gap-6 flex-shrink-0">

          <span className="text-xs sm:text-sm text-slate-600 hidden xs:flex items-center">
            Subscription
            <span className="ml-1 sm:ml-2 px-2 sm:px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold shadow-sm">
              Active
            </span>
          </span>

          <div className="flex items-center gap-2 sm:gap-3 bg-slate-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow text-sm sm:text-base">
              S
            </div>

            <div className="flex-col leading-tight hidden sm:flex">
              <div className="font-semibold text-sm">
                Sai Santhosh
              </div>
              <div className="text-xs text-slate-500">
                Broker: BNRATHI
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;