
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
    				'SF Pro Text',
    				'-apple-system',
    				'BlinkMacSystemFont',
    				'Inter',
    				'Helvetica Neue',
    				'Arial',
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
    				blue: '#6b7d5f',
    				'blue-light': '#9aa890',
    				gray: '#6f6e66',
    				'gray-light': '#e2e0d6',
    				success: '#7a9070',
    				warning: '#c9a96e',
    				error: '#b56b5a',
    				violet: '#8a8b6e',
    				petrol: '#6b8478'
    			},
    			'color-1': 'hsl(var(--color-1))',
    			'color-2': 'hsl(var(--color-2))',
    			'color-3': 'hsl(var(--color-3))',
    			'color-4': 'hsl(var(--color-4))',
    			'color-5': 'hsl(var(--color-5))',
    			backgroundImage: {
    				'book-bind-bg': 'linear-gradient(90deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 100%)',
    				'book-pages': 'linear-gradient(90deg, #f1f1f1 0%, #fff 100%)',
    				ali: 'url("/texture.png")'
    			},
    			boxShadow: {
    				book: '5px 5px 20px rgba(0, 0, 0, 0.2)'
    			}
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
    			'neo-sm': '3px 3px 6px #d9d9d9, -3px -3px 6px #ffffff'
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
			'pulse-glow': {
				'0%, 100%': {
					boxShadow: '0 0 25px -5px rgba(107, 125, 95, 0.35)',
					transform: 'scale(1)'
				},
				'50%': {
					boxShadow: '0 0 45px -5px rgba(107, 125, 95, 0.55)',
					transform: 'scale(1.03)'
				}
			},
			'shimmer': {
				'0%': { backgroundPosition: '200% 0' },
				'100%': { backgroundPosition: '-200% 0' }
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
			'shimmer': 'shimmer 4s infinite linear'
    		},
    		backgroundSize: {
    			'shine-size': '200% 200%'
    		}
    	}
    },
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
