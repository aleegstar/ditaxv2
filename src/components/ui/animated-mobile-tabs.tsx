
"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, MessageCircle } from 'lucide-react'
import { ElementsIcon } from './ElementsIcon'
import { cn } from "@/lib/utils"

type IconComponentType = React.ElementType<{ className?: string }>

export interface MobileTabItem {
  label: string
  icon: IconComponentType
  route: string
}

export interface AnimatedMobileTabsProps {
  items?: MobileTabItem[]
  className?: string
}

const defaultItems: MobileTabItem[] = [
  { label: 'Steuern', icon: Home, route: '/' },
  { label: 'Dokumente', icon: ElementsIcon, route: '/documents' },
  { label: 'Nachrichten', icon: MessageCircle, route: '/chat' },
]

export function AnimatedMobileTabs({ 
  items = defaultItems, 
  className 
}: AnimatedMobileTabsProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const [selected, setSelected] = React.useState(() => {
    const currentRoute = location.pathname
    const activeItem = items.find(item => item.route === currentRoute)
    return activeItem ? activeItem.route : items[0].route
  })

  React.useEffect(() => {
    const currentRoute = location.pathname
    const activeItem = items.find(item => item.route === currentRoute)
    if (activeItem) {
      setSelected(activeItem.route)
    }
  }, [location.pathname, items])

  const handleTabSelect = (route: string) => {
    setSelected(route)
    navigate(route)
  }

  // Hide navbar on certain routes
  const showOnRoutes = ['/', '/documents', '/chat', '/help', '/feedback']
  const shouldShowNavbar = showOnRoutes.includes(location.pathname)
  
  if (!shouldShowNavbar) {
    return null
  }

  return (
    <div className={cn(
      "fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 md:hidden",
      "flex w-fit rounded-full bg-white/20 backdrop-blur-xl border border-white/30 p-1",
      "shadow-2xl shadow-black/20",
      className
    )}>
      {items.map((item) => {
        const isSelected = selected === item.route

        return (
          <button
            key={item.route}
            onClick={() => handleTabSelect(item.route)}
            className={cn(
              "relative w-fit px-6 py-3 text-sm font-semibold transition-colors",
              "flex items-center justify-center",
              "text-black"
            )}
          >
            <div className="relative z-10">
              <span>{item.label}</span>
            </div>
            {isSelected && (
              <motion.span
                layoutId="mobile-tab"
                transition={{ type: "spring", duration: 0.4 }}
                className="absolute inset-0 z-0 rounded-full bg-white shadow-lg"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
