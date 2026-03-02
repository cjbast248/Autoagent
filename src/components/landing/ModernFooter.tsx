
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Twitter, 
  Linkedin, 
  Github, 
  Mail, 
  Phone, 
  MapPin,
  ArrowRight
} from 'lucide-react';

export const ModernFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-16 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <img 
                src="/lovable-uploads/822d4d5f-7855-47c0-9d97-db7e06136296.png" 
                alt="Agent Automation Logo" 
                className="h-8 w-auto brightness-0 invert"
              />
              <span className="text-xl font-bold">Agent Automation</span>
            </div>
            <p className="text-background/70 leading-relaxed">
              Revolutionizing customer service with intelligent AI voice agents that work 24/7 to grow your business.
            </p>
            <div className="flex gap-4">
              <Button variant="outline" size="icon" className="border-background/20 hover:bg-background/10">
                <Twitter className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="border-background/20 hover:bg-background/10">
                <Linkedin className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="border-background/20 hover:bg-background/10">
                <Github className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Product</h3>
            <ul className="space-y-3">
              <li><Link to="/features" className="text-background/70 hover:text-background transition-colors">Features</Link></li>
              <li><Link to="/pricing" className="text-background/70 hover:text-background transition-colors">Pricing</Link></li>
              <li><Link to="/integrations" className="text-background/70 hover:text-background transition-colors">Integrations</Link></li>
              <li><Link to="/api" className="text-background/70 hover:text-background transition-colors">API Documentation</Link></li>
              <li><Link to="/changelog" className="text-background/70 hover:text-background transition-colors">Changelog</Link></li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Company</h3>
            <ul className="space-y-3">
              <li><Link to="/about" className="text-background/70 hover:text-background transition-colors">About Us</Link></li>
              <li><Link to="/careers" className="text-background/70 hover:text-background transition-colors">Careers</Link></li>
              <li><Link to="/blog" className="text-background/70 hover:text-background transition-colors">Blog</Link></li>
              <li><Link to="/press" className="text-background/70 hover:text-background transition-colors">Press</Link></li>
              <li><Link to="/contact" className="text-background/70 hover:text-background transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Stay Updated</h3>
            <p className="text-background/70 text-sm">
              Get the latest updates on AI technology and product news.
            </p>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input 
                  placeholder="Enter your email" 
                  className="bg-background/10 border-background/20 text-background placeholder:text-background/50"
                />
                <Button variant="outline" size="icon" className="border-background/20 hover:bg-background/10 flex-shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-background/50">
                By subscribing, you agree to our Privacy Policy and Terms of Service.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="py-8 border-t border-background/20">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-background/70" />
              <span className="text-background/70">hello@kalina-ai.com</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-background/70" />
              <span className="text-background/70">+1 (555) 123-4567</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-background/70" />
              <span className="text-background/70">San Francisco, CA</span>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="py-8 border-t border-background/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-background/50 text-sm">
              © {currentYear} Agent Automation. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link to="/privacy" className="text-background/50 hover:text-background transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-background/50 hover:text-background transition-colors">
                Terms of Service
              </Link>
              <Link to="/cookies" className="text-background/50 hover:text-background transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
