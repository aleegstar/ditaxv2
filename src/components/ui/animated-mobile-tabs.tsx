
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
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "bg-white border-t border-border/40",
        className
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch justify-around px-2 pt-2 pb-2">
        {items.map((item) => {
          const isSelected = selected === item.route
          const Icon = item.icon

          return (
            <button
              key={item.route}
              onClick={() => handleTabSelect(item.route)}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors",
                isSelected ? "text-primary" : "text-foreground/70"
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{item.label}</span>
              {isSelected && (
                <motion.span
                  layoutId="mobile-tab-indicator"
                  transition={{ type: "spring", duration: 0.4 }}
                  className="absolute bottom-0 h-0.5 w-8 rounded-full bg-primary"
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
