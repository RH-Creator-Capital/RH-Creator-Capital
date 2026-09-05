import React from 'react';

export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onTabChange, className = "" }: TabsProps) {
  return (
    <div className={`flex gap-2 overflow-x-auto pb-2 md:pb-0 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap border ${
            activeTab === tab.id
              ? 'bg-white text-[#0B0D0A] border-transparent font-semibold shadow-sm'
              : 'bg-[#131711] text-color-muted border-color-border hover:bg-white/5 hover:text-white'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
