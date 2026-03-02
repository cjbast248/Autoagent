import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export function Header() {
  const [isOverDemo, setIsOverDemo] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openMobileDropdown, setOpenMobileDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleHeaderOverDemo = (event: CustomEvent) => {
      setIsOverDemo(event.detail.isOver);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('headerOverDemo', handleHeaderOverDemo as EventListener);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('headerOverDemo', handleHeaderOverDemo as EventListener);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  return (
    <header className="relative w-full z-[9999] backdrop-blur-xl bg-white/30 glass border-b border-border/20" style={{overflow: 'visible'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-50">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center hover:scale-105 transition-all duration-300">
            <img 
              src="/lovable-uploads/822d4d5f-7855-47c0-9d97-db7e06136296.png" 
              alt="Agent Automation Logo" 
              className="h-8 w-auto"
            />
            <span className={`ml-3 text-xl font-bold text-shimmer animate-gradient ${
              isOverDemo ? 'text-white' : 'text-primary'
            }`}>
              Agent Automation
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-8 z-[100]">
            {/* PRODUCTS DROPDOWN */}
            <div
              className="relative group/menu"
              onMouseEnter={() => setOpenDropdown('products')}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                className={`transition-all duration-300 hover:scale-105 relative group px-4 py-2 ${
                  isOverDemo ? 'text-white hover:text-muted-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-haspopup="true"
                aria-expanded={openDropdown === 'products'}
                type="button"
              >
                Products
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </button>
              <div
                className={`absolute left-0 top-full w-56 rounded-xl bg-background shadow-lg z-[200] border border-border ${openDropdown === 'products' ? 'block' : 'hidden'}`}
                role="menu"
                style={{ marginTop: '-1px' }}
              >
                <Link to="/products" className="block px-6 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all rounded-t-xl">Motorul AI</Link>
                <Link to="/products" className="block px-6 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">Infrastructura Globală</Link>
                <Link to="/products" className="block px-6 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all rounded-b-xl">Suite Enterprise</Link>
              </div>
            </div>
            
            {/* SOLUTIONS DROPDOWN */}
            <div
              className="relative group/menu"
              onMouseEnter={() => setOpenDropdown('solutions')}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                className={`transition-all duration-300 hover:scale-105 relative group px-4 py-2 ${
                  isOverDemo ? 'text-white hover:text-muted-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-haspopup="true"
                aria-expanded={openDropdown === 'solutions'}
                type="button"
              >
                Solutions
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </button>
              <div
                className={`absolute left-0 top-full w-56 rounded-xl bg-background shadow-lg z-[200] border border-border ${openDropdown === 'solutions' ? 'block' : 'hidden'}`}
                role="menu"
                style={{ marginTop: '-1px' }}
              >
                <Link to="/solutions" className="block px-6 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all rounded-t-xl">Call Centers</Link>
                <Link to="/solutions" className="block px-6 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">Remote Work</Link>
                <Link to="/solutions" className="block px-6 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all rounded-b-xl">Healthcare</Link>
              </div>
            </div>
            
            {/* RESEARCH DROPDOWN */}
            <div
              className="relative group/menu"
              onMouseEnter={() => setOpenDropdown('research')}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                className={`transition-all duration-300 hover:scale-105 relative group px-4 py-2 ${
                  isOverDemo ? 'text-white hover:text-muted-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-haspopup="true"
                aria-expanded={openDropdown === 'research'}
                type="button"
              >
                Research
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </button>
              <div
                className={`absolute left-0 top-full w-56 rounded-xl bg-background shadow-lg z-[200] border border-border ${openDropdown === 'research' ? 'block' : 'hidden'}`}
                role="menu"
                style={{ marginTop: '-1px' }}
              >
                <Link to="/research" className="block px-6 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all rounded-t-xl">Cercetare AI</Link>
                <Link to="/research" className="block px-6 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">Publicații</Link>
                <Link to="/research" className="block px-6 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all rounded-b-xl">Inovații</Link>
              </div>
            </div>
            
            {/* RESOURCES DROPDOWN */}
            <div
              className="relative group/menu"
              onMouseEnter={() => setOpenDropdown('resources')}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                className={`transition-all duration-300 hover:scale-105 relative group px-4 py-2 ${
                  isOverDemo ? 'text-white hover:text-muted-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-haspopup="true"
                aria-expanded={openDropdown === 'resources'}
                type="button"
              >
                Resources
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </button>
              <div
                className={`absolute left-0 top-full w-56 rounded-xl bg-background shadow-lg z-[200] border border-border ${openDropdown === 'resources' ? 'block' : 'hidden'}`}
                role="menu"
                style={{ marginTop: '-1px' }}
              >
                <Link to="/resources" className="block px-6 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all rounded-t-xl">Documentație</Link>
                <Link to="/resources" className="block px-6 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">Tutoriale</Link>
                <Link to="/resources" className="block px-6 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all rounded-b-xl">Suport</Link>
              </div>
            </div>
            
            <Link to="/pricing" className={`transition-all duration-300 hover:scale-105 relative group px-4 py-2 ${
              isOverDemo ? 'text-white hover:text-muted-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>
              Pricing
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </Link>
            
            <Link to="/company" className={`transition-all duration-300 hover:scale-105 relative group px-4 py-2 ${
              isOverDemo ? 'text-white hover:text-muted-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>
              Company
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </nav>
          
          {/* Desktop CTA Button */}
          <Link to="/auth" className="hidden md:block">
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg">
              Get Started
            </button>
          </Link>

          {/* Mobile Burger Menu Button */}
          <button
            onClick={() => {
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }}
            className={`md:hidden relative z-[10000] w-10 h-10 flex flex-col justify-center items-center transition-all duration-300 border-2 border-transparent hover:border-border rounded ${
              isOverDemo ? 'text-white' : 'text-foreground'
            }`}
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
          >
            <span className={`block h-0.5 w-6 bg-current transition-all duration-300 ${
              isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''
            }`}></span>
            <span className={`block h-0.5 w-6 bg-current transition-all duration-300 my-1 ${
              isMobileMenuOpen ? 'opacity-0' : ''
            }`}></span>
            <span className={`block h-0.5 w-6 bg-current transition-all duration-300 ${
              isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''
            }`}></span>
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-x-0 bg-background shadow-lg z-[9998] border-t border-border" style={{ top: '64px', minHeight: '400px' }}>
            <nav className="p-6">
              <div className="space-y-4">
                
                {/* Products */}
                <div className="py-4 border-b border-border">
                  <button
                    onClick={() => setOpenMobileDropdown(openMobileDropdown === 'products' ? null : 'products')}
                    className="flex items-center justify-between w-full text-left text-foreground font-semibold text-lg"
                  >
                    Products
                    <span className="text-xl">{openMobileDropdown === 'products' ? '−' : '+'}</span>
                  </button>
                  {openMobileDropdown === 'products' && (
                    <div className="mt-3 pl-4 space-y-2">
                      <Link to="/products" className="block text-muted-foreground py-1" onClick={() => setIsMobileMenuOpen(false)}>Motorul AI</Link>
                      <Link to="/products" className="block text-muted-foreground py-1" onClick={() => setIsMobileMenuOpen(false)}>Infrastructura Globală</Link>
                      <Link to="/products" className="block text-muted-foreground py-1" onClick={() => setIsMobileMenuOpen(false)}>Suite Enterprise</Link>
                    </div>
                  )}
                </div>

                {/* Solutions */}
                <div className="py-4 border-b border-border">
                  <button
                    onClick={() => setOpenMobileDropdown(openMobileDropdown === 'solutions' ? null : 'solutions')}
                    className="flex items-center justify-between w-full text-left text-foreground font-semibold text-lg"
                  >
                    Solutions
                    <span className="text-xl">{openMobileDropdown === 'solutions' ? '−' : '+'}</span>
                  </button>
                  {openMobileDropdown === 'solutions' && (
                    <div className="mt-3 pl-4 space-y-2">
                      <Link to="/solutions" className="block text-muted-foreground py-1" onClick={() => setIsMobileMenuOpen(false)}>Call Centers</Link>
                      <Link to="/solutions" className="block text-muted-foreground py-1" onClick={() => setIsMobileMenuOpen(false)}>Remote Work</Link>
                      <Link to="/solutions" className="block text-muted-foreground py-1" onClick={() => setIsMobileMenuOpen(false)}>Healthcare</Link>
                    </div>
                  )}
                </div>

                {/* Research */}
                <div className="py-4 border-b border-border">
                  <button
                    onClick={() => setOpenMobileDropdown(openMobileDropdown === 'research' ? null : 'research')}
                    className="flex items-center justify-between w-full text-left text-foreground font-semibold text-lg"
                  >
                    Research
                    <span className="text-xl">{openMobileDropdown === 'research' ? '−' : '+'}</span>
                  </button>
                  {openMobileDropdown === 'research' && (
                    <div className="mt-3 pl-4 space-y-2">
                      <Link to="/research" className="block text-muted-foreground py-1" onClick={() => setIsMobileMenuOpen(false)}>Cercetare AI</Link>
                      <Link to="/research" className="block text-muted-foreground py-1" onClick={() => setIsMobileMenuOpen(false)}>Publicații</Link>
                      <Link to="/research" className="block text-muted-foreground py-1" onClick={() => setIsMobileMenuOpen(false)}>Inovații</Link>
                    </div>
                  )}
                </div>

                {/* Resources */}
                <div className="py-4 border-b border-border">
                  <button
                    onClick={() => setOpenMobileDropdown(openMobileDropdown === 'resources' ? null : 'resources')}
                    className="flex items-center justify-between w-full text-left text-foreground font-semibold text-lg"
                  >
                    Resources
                    <span className="text-xl">{openMobileDropdown === 'resources' ? '−' : '+'}</span>
                  </button>
                  {openMobileDropdown === 'resources' && (
                    <div className="mt-3 pl-4 space-y-2">
                      <Link to="/resources" className="block text-muted-foreground py-1" onClick={() => setIsMobileMenuOpen(false)}>Documentație</Link>
                      <Link to="/resources" className="block text-muted-foreground py-1" onClick={() => setIsMobileMenuOpen(false)}>Tutoriale</Link>
                      <Link to="/resources" className="block text-muted-foreground py-1" onClick={() => setIsMobileMenuOpen(false)}>Suport</Link>
                    </div>
                  )}
                </div>

                <div className="py-4 border-b border-border">
                  <Link to="/pricing" className="block text-foreground font-semibold text-lg" onClick={() => setIsMobileMenuOpen(false)}>Pricing</Link>
                </div>

                <div className="py-4 border-b border-border">
                  <Link to="/company" className="block text-foreground font-semibold text-lg" onClick={() => setIsMobileMenuOpen(false)}>Company</Link>
                </div>

                <div className="pt-4">
                  <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                    <button className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                      Get Started
                    </button>
                  </Link>
                </div>

              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}