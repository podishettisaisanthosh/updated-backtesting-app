import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-6 px-4 sm:px-8 text-center text-sm">
      <p className="mb-2 text-xs sm:text-sm leading-relaxed">
        SEBI Regn No: INH200009935 | BSE Enlistment No. 5592 | CIN No.U74999TG2022PTC162657
      </p>
      <p className="mb-4 text-xs sm:text-sm">© Modern Algos Pvt. Ltd. All Rights Reserved.</p>
      <div className="flex flex-wrap justify-center gap-3 sm:gap-6">
        <a href="#compliance" className="text-gray-300 hover:text-white transition-colors text-xs sm:text-sm">Compliance</a>
        <a href="#privacy" className="text-gray-300 hover:text-white transition-colors text-xs sm:text-sm">Privacy</a>
        <a href="#terms" className="text-gray-300 hover:text-white transition-colors text-xs sm:text-sm">Terms</a>
        <a href="#disclaimer" className="text-gray-300 hover:text-white transition-colors text-xs sm:text-sm">Disclaimer</a>
        <a href="#mitc" className="text-gray-300 hover:text-white transition-colors text-xs sm:text-sm">MITC</a>
      </div>
    </footer>
  );
};

export default Footer;