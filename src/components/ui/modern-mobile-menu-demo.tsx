
import React, { useState, useEffect } from 'react';
import { InteractiveMenu, InteractiveMenuItem } from "@/components/ui/modern-mobile-menu";
import { Home, Briefcase, Calendar, Shield, Settings } from 'lucide-react';

const lucideDemoMenuItems: InteractiveMenuItem[] = [
    { label: 'home', icon: Home, route: '/' },
    { label: 'strategy', icon: Briefcase, route: '/strategy' },
    { label: 'period', icon: Calendar, route: '/period' },
    { label: 'security', icon: Shield, route: '/security' },
    { label: 'settings', icon: Settings, route: '/settings' },
];

const customAccentColor = 'var(--chart-2)';

const Default = () => {
  return  <InteractiveMenu />;
};

const Customized = () => {
  return  <InteractiveMenu items={lucideDemoMenuItems} accentColor={customAccentColor} />;
};

export { Default, Customized };
