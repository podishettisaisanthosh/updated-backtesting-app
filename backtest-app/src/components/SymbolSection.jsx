import React from 'react';
import { getSymbolsAPI } from '../services/api';

const SymbolSection = ({ selectedSymbol, setSelectedSymbol, lotSize, validity, setValidity }) => {
  const symbols = getSymbolsAPI();

  return (
    <div className="bg-white p-8 rounded-xl shadow-md mb-8 flex justify-between items-center flex-wrap gap-4">
      <div className="flex-1 min-w-[250px]">
        <div className="relative flex items-center bg-white border-[1.5px] border-gray-300 rounded-xl px-4 py-3 min-w-[320px] max-w-[420px] w-full transition-all duration-250 shadow-sm hover:border-gray-400 focus-within:border-primary focus-within:shadow-md focus-within:shadow-primary/15">
          <span className="mr-3 text-lg text-gray-500">🔍</span>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="border-none bg-transparent text-base font-semibold flex-1 cursor-pointer outline-none text-gray-800"
          >
            {symbols.map(({ symbol }) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 text-sm text-gray-600 font-medium">
          Lot Size: <span className="font-bold text-gray-800">{lotSize}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className={`px-8 py-3 border-none rounded-lg font-semibold cursor-pointer transition-all text-sm ${
            validity === 'Intraday'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setValidity('Intraday')}
        >
          Intraday
        </button>
        <button
          className={`px-8 py-3 border-none rounded-lg font-semibold cursor-pointer transition-all text-sm ${
            validity === 'Positional'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setValidity('Positional')}
        >
          Positional
        </button>
      </div>
    </div>
  );
};

export default SymbolSection;
