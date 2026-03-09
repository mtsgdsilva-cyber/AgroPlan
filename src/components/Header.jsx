// src/components/Header.jsx
import React from 'react';
import { Sprout } from 'lucide-react';

export default function Header({ title }) {
  return (
    <header className="bg-white px-6 py-4 sticky top-0 z-20 shadow-sm rounded-b-3xl mb-4 flex items-center gap-3 border-b border-gray-50">
      <div className="bg-green-100 p-2 rounded-xl">
        <Sprout className="text-green-600" size={24} />
      </div>
      <h1 className="text-xl font-bold text-gray-800">{title}</h1>
    </header>
  );
}