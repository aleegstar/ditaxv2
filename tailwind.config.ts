
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
    	container: {
    		center: true,
    		padding: '2rem',
    		screens: {
    			'2xl': '1400px'
    		}
    	},
    	extend: {
    		fontFamily: {
    			sans: [
    				'Plus Jakarta Sans',
    				'ui-sans-serif',
    				'system-ui',
    				'sans-serif',
    				'Apple Color Emoji',
    				'Segoe UI Emoji',
    				'Segoe UI Symbol',
    				'Noto Color Emoji'
    			],
    			jakarta: [
    				'Plus Jakarta Sans',
    				'sans-serif'
    			],
    			serif: [
    				'ui-serif',
    				'Georgia',
    				'Cambria',
    				'Times New Roman',
    				'Times',
    				'serif'
    			],
    			mono: [
    				'ui-monospace',
    				'SFMono-Regular',
    				'Menlo',
    				'Monaco',
    				'Consolas',
    				'Liberation Mono',
    				'Courier New',
    				'monospace'
    			]
    		},
    		colors: {
    			border: 'hsl(var(--border))',
    			input: 'hsl(var(--input))',
    			ring: 'hsl(var(--ring))',
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))'
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			success: {
    				DEFAULT: 'hsl(var(--success))',
    				foreground: 'hsl(var(--success-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    			sidebar: {
    				DEFAULT: 'hsl(var(--sidebar-background))',
    				foreground: 'hsl(var(--sidebar-foreground))',
    				primary: 'hsl(var(--sidebar-primary))',
    				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
    				accent: 'hsl(var(--sidebar-accent))',
    				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
    				border: 'hsl(var(--sidebar-border))',
    				ring: 'hsl(var(--sidebar-ring))'
    			},
    			tax: {
    				blue: '#1d64ff',
    				'blue-light': '#60a5fa',
    				gray: '#64748b',
    				'gray-light': '#e2e8f0',
    				success: '#10b981',
    				warning: '#f59e0b',
    				error: '#ef4444',
    				violet: '#8b5cf6',
    				petrol: '#0d9488'
    			},
    			'color-1': 'hsl(var(--color-1))',
    			'color-2': 'hsl(var(--color-2))',
    			'color-3': 'hsl(var(--color-3))',
    			'color-4': 'hsl(var(--color-4))',
			'color-5': 'hsl(var(--color-5))'
		},
		backgroundImage: {
			'book-bind-bg': 'linear-gradient(90deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 100%)',
			'book-pages': 'linear-gradient(90deg, #f1f1f1 0%, #fff 100%)',
			ali: 'url("/texture.png")',
			'liquid-gradient': 'linear-gradient(180deg, #f0f4ff 0%, #e8eeff 50%, #f5f0ff 100%)',
			'liquid-radial': 'radial-gradient(circle at 30% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)'
		},
		backdropBlur: {
			'glass': '20px',
			'glass-lg': '40px'
		},
		zIndex: {
			'100': '100',
			'101': '101',
			'102': '102'
		},
		borderRadius: {
			lg: 'var(--radius)',
			md: 'calc(var(--radius) - 2px)',
			sm: 'calc(var(--radius) - 4px)'
		},
		boxShadow: {
			neo: '5px 5px 10px #d9d9d9, -5px -5px 10px #ffffff',
			'neo-sm': '3px 3px 6px #d9d9d9, -3px -3px 6px #ffffff',
			'glass': '0 8px 32px rgba(31, 38, 135, 0.15)',
			'glass-sm': '0 4px 16px rgba(31, 38, 135, 0.1)',
			'glass-lg': '0 12px 40px rgba(31, 38, 135, 0.2)',
			'glass-xl': '0 16px 48px rgba(31, 38, 135, 0.25)',
			'liquid': '0 4px 24px rgba(0, 0, 0, 0.06)',
			'liquid-sm': '0 2px 12px rgba(0, 0, 0, 0.04)',
			'liquid-lg': '0 8px 32px rgba(0, 0, 0, 0.08)',
			'blue': '0 4px 14px rgba(29, 100, 255, 0.25)',
			'blue-lg': '0 6px 20px rgba(29, 100, 255, 0.35)'
		},
    		keyframes: {
    			'accordion-down': {
    				from: {
    					height: '0'
    				},
    				to: {
    					height: 'var(--radix-accordion-content-height)'
    				}
    			},
    			'accordion-up': {
    				from: {
    					height: 'var(--radix-accordion-content-height)'
    				},
    				to: {
    					height: '0'
    				}
    			},
    			'slide-in': {
    				'0%': {
    					opacity: '0',
    					transform: 'translateX(-100%)'
    				},
    				'100%': {
    					opacity: '1',
    					transform: 'translateX(0)'
    				}
    			},
    			'slide-out': {
    				'0%': {
    					opacity: '1',
    					transform: 'translateX(0)'
    				},
    				'100%': {
    					opacity: '0',
    					transform: 'translateX(-100%)'
    				}
    			},
    			'fade-out': {
    				'0%': {
    					opacity: '1'
    				},
    				'100%': {
    					opacity: '0'
    				}
    			},
    			'fade-in': {
    				'0%': {
    					opacity: '0',
    					transform: 'translateY(10px)'
    				},
    				'100%': {
    					opacity: '1',
    					transform: 'translateY(0)'
    				}
    			},
    			rainbow: {
    				'0%': {
    					backgroundPosition: '0%'
    				},
    				'100%': {
    					backgroundPosition: '200%'
    				}
    			},
    			'star-movement-top': {
    				'0%': {
    					transform: 'translate(0%, 0%)',
    					opacity: '1'
    				},
    				'100%': {
    					transform: 'translate(100%, 0%)',
    					opacity: '0'
    				}
    			},
    			'star-movement-bottom': {
    				'0%': {
    					transform: 'translate(0%, 0%)',
    					opacity: '1'
    				},
    				'100%': {
    					transform: 'translate(-100%, 0%)',
    					opacity: '0'
    				}
    			},
    			shine: {
    				'0%': {
    					backgroundPosition: '200% 0'
    				},
    				'100%': {
    					backgroundPosition: '-200% 0'
    				}
    			},
    			'border-beam': {
    				'100%': {
    					'offset-distance': '100%'
    				}
    			},
    			'spin-path': {
    				'0%': {
    					'stroke-dashoffset': '0'
    				},
    				'100%': {
    					'stroke-dashoffset': '-403px'
    				}
    			},
    			'spin-circle': {
    				'0%': {
    					'stroke-dashoffset': '0'
    				},
    				'100%': {
    					'stroke-dashoffset': '-403px'
    				}
    			},
    			'gentle-pulse': {
    				'0%, 100%': {
    					transform: 'scale(1)',
    					opacity: '1'
    				},
    				'50%': {
    					transform: 'scale(1.02)',
    					opacity: '0.9'
    				}
    			},
			'scroll-left': {
				'0%': {
					transform: 'translateX(0)'
				},
				'100%': {
					transform: 'translateX(-33.333%)'
				}
			},
			'float-slow': {
				'0%, 100%': {
					transform: 'translate(0, 0) scale(1)'
				},
				'50%': {
					transform: 'translate(10px, -15px) scale(1.05)'
				}
			},
			'pulse-glow': {
				'0%, 100%': {
					boxShadow: '0 0 25px -5px rgba(29, 100, 255, 0.4)',
					transform: 'scale(1)'
				},
				'50%': {
					boxShadow: '0 0 45px -5px rgba(29, 100, 255, 0.65)',
					transform: 'scale(1.03)'
				}
			}
    		},
    		animation: {
    			'accordion-down': 'accordion-down 0.2s ease-out',
    			'accordion-up': 'accordion-up 0.2s ease-out',
    			'slide-in': 'slide-in 0.3s ease-out',
    			'slide-out': 'slide-out 0.3s ease-out',
    			'fade-in': 'fade-in 0.5s ease-out',
    			'fade-out': 'fade-out 0.3s ease-out',
    			rainbow: 'rainbow var(--speed, 2s) infinite linear',
    			'star-movement-top': 'star-movement-top linear infinite alternate',
    			'star-movement-bottom': 'star-movement-bottom linear infinite alternate',
    			shine: 'shine var(--duration) linear infinite',
    			'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
    			'spin-path': 'spin-path 10s infinite linear',
    			'spin-circle': 'spin-circle 3s infinite linear',
    			'gentle-pulse': 'gentle-pulse 2s ease-in-out infinite',
			'scroll-left': 'scroll-left 15s linear infinite',
			'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
			'float-slow': 'float-slow 20s ease-in-out infinite'
    		},
    		backgroundSize: {
    			'shine-size': '200% 200%'
    		}
    	}
    },
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
