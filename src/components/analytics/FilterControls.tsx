
import React from 'react';
import { Calendar, Filter, Users, Languages } from 'lucide-react';

interface FilterControlsProps {
  filters: {
    dateRange: string;
    agents: string[];
    sentiment: number[];
    language: string;
    customerType: string[];
  };
  onFiltersChange: (filters: any) => void;
}

const FilterControls = ({ filters, onFiltersChange }: FilterControlsProps) => {
  const dateRangeOptions = [
    { value: '1d', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' }
  ];

  const languageOptions = [
    { value: 'all', label: 'All Languages' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' }
  ];

  const updateFilter = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  return (
    <div className="flex items-center space-x-4 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
      {/* Date Range */}
      <div className="flex items-center space-x-2">
        <Calendar size={16} className="text-gray-500" />
        <select
          value={filters.dateRange}
          onChange={(e) => updateFilter('dateRange', e.target.value)}
          className="bg-transparent border-none outline-none text-sm font-medium cursor-pointer"
        >
          {dateRangeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Sentiment Range */}
      <div className="flex items-center space-x-2">
        <Filter size={16} className="text-gray-500" />
        <span className="text-sm text-gray-600">Sentiment:</span>
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min="0"
            max="100"
            value={filters.sentiment[0]}
            onChange={(e) => updateFilter('sentiment', [Number(e.target.value), filters.sentiment[1]])}
            className="w-16 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-gray-500">
            {filters.sentiment[0]}% - {filters.sentiment[1]}%
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={filters.sentiment[1]}
            onChange={(e) => updateFilter('sentiment', [filters.sentiment[0], Number(e.target.value)])}
            className="w-16 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Language Filter */}
      <div className="flex items-center space-x-2">
        <Languages size={16} className="text-gray-500" />
        <select
          value={filters.language}
          onChange={(e) => updateFilter('language', e.target.value)}
          className="bg-transparent border-none outline-none text-sm cursor-pointer"
        >
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Agent Filter */}
      <div className="flex items-center space-x-2">
        <Users size={16} className="text-gray-500" />
        <span className="text-sm text-gray-600">
          {filters.agents.length === 0 ? 'All Agents' : `${filters.agents.length} selected`}
        </span>
      </div>

      {/* Reset Filters */}
      <button
        onClick={() => onFiltersChange({
          dateRange: '7d',
          agents: [],
          sentiment: [0, 100],
          language: 'all',
          customerType: []
        })}
        className="text-sm text-blue-500 hover:text-blue-600 transition-colors"
      >
        Reset
      </button>
    </div>
  );
};

export default FilterControls;
