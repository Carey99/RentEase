import React, { useEffect, useState } from 'react';
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  Home, 
  Star, 
  Shield, 
  Users, 
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Menu,
  X,
  Zap,
  Smartphone,
  BarChart3,
  Lock,
  Globe,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import './landing-premium.css';

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHeroDropdownOpen, setIsHeroDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setScrollY(scrollPosition);
      setIsScrolled(scrollPosition > 50);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const startOnboarding = (role: 'landlord' | 'tenant') => {
    setLocation(`/onboarding/${role}`);
    setIsDropdownOpen(false);
    setIsMenuOpen(false);
  };

  const goToSignin = () => {
    setLocation('/signin');
  };

  return (
    <div className="premium-landing">
      {/* Soft Gradient Background */}
      <div className="gradient-background">
        <div className="gradient-mesh"></div>
      </div>

      {/* Premium Navigation */}
      <motion.nav 
        className={`premium-nav ${isScrolled ? 'scrolled' : ''}`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="nav-container">
          <div className="nav-logo">
            <img 
              src={'/logos/re_light_icon.png'}
              alt="RentEase" 
              className="nav-logo-icon"
            />
            <div className="nav-logo-text">
              <span className="logo-rent">
                <span className="letter" style={{ animationDelay: '2s' }}>R</span>
                <span className="letter" style={{ animationDelay: '2.4s' }}>e</span>
                <span className="letter" style={{ animationDelay: '2.8s' }}>n</span>
                <span className="letter" style={{ animationDelay: '3.2s' }}>t</span>
              </span>
              <span className="logo-ease">Ease</span>
            </div>
          </div>
          
          <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
            <a href="#features" className="nav-link" onClick={() => setIsMenuOpen(false)}>Features</a>
            <a href="#product" className="nav-link" onClick={() => setIsMenuOpen(false)}>Product</a>
            <a href="#pricing" className="nav-link" onClick={() => setIsMenuOpen(false)}>Pricing</a>
            <Button onClick={goToSignin} variant="ghost" className="sign-in-btn">
              Sign In
            </Button>
            
            {/* Dropdown Button for Get Started */}
            <div className="dropdown-wrapper">
              <Button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                onMouseEnter={() => setIsDropdownOpen(true)}
                className={`get-started-btn ${isDropdownOpen ? 'active' : ''}`}
              >
                Get Started
                <motion.div
                  animate={{ rotate: isDropdownOpen ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight size={16} />
                </motion.div>
              </Button>
              
              {isDropdownOpen && (
                <motion.div 
                  className="dropdown-menu"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  <button 
                    className="dropdown-item"
                    onClick={() => startOnboarding('landlord')}
                  >
                    <Home size={18} />
                    <div className="dropdown-item-content">
                      <strong>Sign up as Landlord</strong>
                      <span>Manage your properties</span>
                    </div>
                  </button>
                  <button 
                    className="dropdown-item"
                    onClick={() => startOnboarding('tenant')}
                  >
                    <Users size={18} />
                    <div className="dropdown-item-content">
                      <strong>Sign up as Tenant</strong>
                      <span>Find your next home</span>
                    </div>
                  </button>
                </motion.div>
              )}
            </div>
          </div>

          <button 
            className="mobile-menu-btn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content-wrapper">
          <div className="hero-left">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              
              <h1 className="hero-headline">
                Property management
                <span className="gradient-text-premium"> that just works</span>
              </h1>
              
              <p className="hero-subheadline">
                The most intuitive platform for landlords and tenants. 
                Seamless payments, real-time insights, and zero hassle.
              </p>

              <div className="hero-cta-group">
                <div 
                  className="hero-dropdown-wrapper"
                  onMouseLeave={() => setIsHeroDropdownOpen(false)}
                >
                  <Button 
                    onClick={() => setIsHeroDropdownOpen(!isHeroDropdownOpen)}
                    onMouseEnter={() => setIsHeroDropdownOpen(true)}
                    className={`cta-primary ${isHeroDropdownOpen ? 'active' : ''}`}
                    size="lg"
                  >
                    Start for free
                    <motion.div
                      animate={{ rotate: isHeroDropdownOpen ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronRight size={18} />
                    </motion.div>
                  </Button>
                  
                  {isHeroDropdownOpen && (
                    <motion.div 
                      className="hero-dropdown-menu"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <button 
                        className="hero-dropdown-item"
                        onClick={() => {
                          startOnboarding('landlord');
                          setIsHeroDropdownOpen(false);
                        }}
                      >
                        As Landlord
                      </button>
                      <button 
                        className="hero-dropdown-item"
                        onClick={() => {
                          startOnboarding('tenant');
                          setIsHeroDropdownOpen(false);
                        }}
                      >
                        As Tenant
                      </button>
                    </motion.div>
                  )}
                </div>
                <Button 
                  onClick={() => startOnboarding('tenant')}
                  variant="outline"
                  className="cta-secondary"
                  size="lg"
                >
                  Find a home
                </Button>
              </div>

              <div className="hero-trust-bar">
                <div className="trust-item">
                  <CheckCircle size={16} className="trust-icon" />
                  <span>No credit card required</span>
                </div>
                <div className="trust-item">
                  <CheckCircle size={16} className="trust-icon" />
                  <span>Free 30-day trial</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Center Divider with Lines and Text */}
          <div className="hero-center-divider">
            <div className="divider-line divider-line-1"></div>
            <div className="divider-line divider-line-2"></div>
            <div className="divider-text-wrapper">
              <span className="divider-letter">R</span>
              <span className="divider-letter">e</span>
              <span className="divider-letter">n</span>
              <span className="divider-letter">t</span>
              <span className="divider-letter">E</span>
              <span className="divider-letter">a</span>
              <span className="divider-letter">s</span>
              <span className="divider-letter">e</span>
            </div>
            <div className="divider-line divider-line-3"></div>
            <div className="divider-line divider-line-4"></div>
          </div>

          <div className="hero-right">
            {/* Hero Image */}
            <div className="hero-image-wrapper">
              <img 
                src="/images/Herobg.png" 
                alt="Property management" 
                className="hero-main-image"
              />
            </div>
          </div>
        </div>

      </section>

      {/* Why Choose Us Section */}
      <section className="why-choose-section">
        <motion.div 
          className="why-choose-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="decorative-line"></div>
          <h2 className="why-choose-title">WHY CHOOSE US</h2>
          <div className="decorative-line"></div>
        </motion.div>

        <motion.h3 
          className="why-choose-headline"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          For All Your Property Management Needs
        </motion.h3>

        <div className="why-choose-grid">
          <motion.div 
            className="why-choose-card"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="why-icon">
              <Shield size={32} />
            </div>
            <h4>Secure & Reliable</h4>
            <p>Bank-grade encryption ensures your data and payments are always protected</p>
          </motion.div>

          <motion.div 
            className="why-choose-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="why-icon">
              <Zap size={32} />
            </div>
            <h4>Lightning Fast</h4>
            <p>Real-time payment processing and instant notifications keep you in control</p>
          </motion.div>

          <motion.div 
            className="why-choose-card"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="why-icon">
              <BarChart3 size={32} />
            </div>
            <h4>Smart Analytics</h4>
            <p>Comprehensive insights and reports to optimize your property business</p>
          </motion.div>
        </div>
      </section>

      {/* Application Flow Section */}
      <section id="features" className="flow-section">
        <motion.div 
          className="flow-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="flow-title">How It Works</h2>
          <p className="flow-subtitle">Seamless workflow from onboarding to payment collection</p>
        </motion.div>

        <motion.div 
          className="flow-svg-container"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <img 
            src="/images/flowchart.svg" 
            alt="RentEase workflow: from property setup to payment collection" 
            className="flow-svg-image"
          />
        </motion.div>
      </section>

      {/* Final CTA Section */}
      <section className="final-cta-section">
        <div className="final-cta-container">
          <motion.div 
            className="cta-card-premium"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="cta-content-premium">
              <h2 className="cta-headline">Ready to transform your rental business?</h2>
              <p className="cta-subheadline">
                Start managing your properties efficiently today
              </p>
              
              <div className="cta-buttons-premium">
                <Button 
                  onClick={() => startOnboarding('landlord')}
                  className="cta-btn-primary"
                  size="lg"
                >
                  Start for free
                  <ArrowRight size={18} />
                </Button>
                <Button 
                  onClick={goToSignin}
                  variant="ghost"
                  className="cta-btn-secondary"
                  size="lg"
                >
                  Sign in
                </Button>
              </div>

              <div className="cta-benefits">
                <div className="benefit-item">
                  <CheckCircle size={18} />
                  <span>Free 30-day trial</span>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={18} />
                  <span>No credit card required</span>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={18} />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="logo">
                <Home className="logo-icon" />
                <span className="logo-text">RentEase</span>
              </div>
              <p>The future of property management</p>
            </div>
            
            <div className="footer-links">
              <div className="link-group">
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <a href="#integrations">Integrations</a>
              </div>
              
              <div className="link-group">
                <h4>Company</h4>
                <a href="#about">About</a>
                <a href="#careers">Careers</a>
                <a href="#contact">Contact</a>
              </div>
              
              <div className="link-group">
                <h4>Resources</h4>
                <a href="#blog">Blog</a>
                <a href="#help">Help Center</a>
                <a href="#api">API Docs</a>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; 2025 RentEase. All rights reserved.</p>
            <div className="footer-legal">
              <a href="#privacy">Privacy</a>
              <a href="#terms">Terms</a>
              <a href="#security">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
