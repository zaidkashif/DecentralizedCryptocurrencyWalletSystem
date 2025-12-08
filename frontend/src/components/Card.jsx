import React from "react";

function Card({ title, children, className = "" }) {
  return (
    <div
      className={`bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-6 ${className}`}
    >
      {title && <h2 className="text-xl font-bold text-white mb-4">{title}</h2>}
      {children}
    </div>
  );
}

export default Card;
