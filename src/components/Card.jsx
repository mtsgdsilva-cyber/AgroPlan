// src/components/Card.jsx
import React from 'react';

export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-3 ${className}`}>
      {children}
    </div>
  );
}