import React from 'react';

interface CardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  colorClass?: string;
}

const Card: React.FC<CardProps> = ({ title, value, description, icon, colorClass = 'bg-white' }) => {
  return (
    <div className={`p-6 rounded-xl shadow-lg flex flex-col items-center justify-center text-center ${colorClass}`}>
      {icon && <div className="mb-3 text-blue-600">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-4xl font-extrabold text-blue-800 mb-2">{value}</p>
      {description && <p className="text-sm text-gray-500">{description}</p>}
    </div>
  );
};

export default Card;
