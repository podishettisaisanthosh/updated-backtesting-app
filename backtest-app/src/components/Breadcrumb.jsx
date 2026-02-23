import React from 'react';

const Breadcrumb = () => {
  return (
    <div className="bg-white px-4 sm:px-8 py-3 border-b border-gray-200 text-sm text-gray-600">
      <span>🏠</span>
      <span className="mx-2 text-gray-400">›</span>
      <span>Back-Testing</span>
    </div>
  );
};

export default Breadcrumb;