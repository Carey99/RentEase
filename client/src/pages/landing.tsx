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
import DashboardMockup from '@/components/landing/DashboardMockup';
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
              <div className="hero-badge">
                <Sparkles size={14} />
                <span>Award winning PropTech</span>
              </div>
              
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

        {/* Floating Stats */}
        <motion.div 
          className="hero-stats-floating"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <div className="stat-item">
            <div className="stat-value">231+</div>
            <div className="stat-label">Properties managed</div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <div className="stat-value">KES 13M+</div>
            <div className="stat-label">Processed monthly</div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <div className="stat-value">99.8%</div>
            <div className="stat-label">Uptime guarantee</div>
          </div>
        </motion.div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="features-section">
        <div className="features-container">
          <motion.div 
            className="section-header-premium"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="section-title-premium">Everything you need to succeed</h2>
            <p className="section-subtitle-premium">
              Powerful features that make property management effortless
            </p>
          </motion.div>

          <div className="bento-grid">
            {/* Large Feature Card - Payments */}
            <motion.div 
              className="bento-card large"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              whileHover={{ y: -5 }}
            >
              <div className="bento-content">
                <div className="bento-icon purple">
                  <Smartphone size={24} />
                </div>
                <h3 className="bento-title">M-Pesa Integration</h3>
                <p className="bento-description">
                  Instant rent collection with STK push. Automated reminders and receipt generation. Zero manual work.
                </p>
                <div className="bento-visual">
                  <div className="payment-demo">
                    <div className="payment-card">
                      <div className="payment-header">
                        <span className="payment-badge">Received</span>
                        <span className="payment-amount">KES 45,000</span>
                      </div>
                      <div className="payment-details">
                        <div className="payment-row">
                          <span>Grace Wanjiku</span>
                          <span>Apt 4B</span>
                        </div>
                        <div className="payment-row small">
                          <span>Dec 15, 2025 • 2:34 PM</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Medium Feature Card - Analytics */}
            <motion.div 
              className="bento-card medium"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="bento-content">
                <div className="bento-icon blue">
                  <BarChart3 size={24} />
                </div>
                <h3 className="bento-title">Real-time Analytics</h3>
                <p className="bento-description">
                  Track revenue, occupancy, and performance metrics in real-time.
                </p>
                <div className="bento-visual">
                  <div className="chart-mini">
                    <div className="chart-bars-mini">
                      {[40, 70, 55, 85, 65, 90].map((height, i) => (
                        <motion.div
                          key={i}
                          className="bar-mini"
                          initial={{ height: 0 }}
                          whileInView={{ height: `${height}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Small Feature Card - Security */}
            <motion.div 
              className="bento-card small"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ y: -5 }}
            >
              <div className="bento-content">
                <div className="bento-icon green">
                  <Shield size={24} />
                </div>
                <h3 className="bento-title">Bank-level Security</h3>
                <p className="bento-description">
                  256-bit encryption and secure data storage.
                </p>
              </div>
            </motion.div>

            {/* Small Feature Card - Support */}
            <motion.div 
              className="bento-card small"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{ y: -5 }}
            >
              <div className="bento-content">
                <div className="bento-icon orange">
                  <Users size={24} />
                </div>
                <h3 className="bento-title">24/7 Support</h3>
                <p className="bento-description">
                  Always here to help. Response time under 2 hours.
                </p>
              </div>
            </motion.div>

            {/* Medium Feature Card - Automation */}
            <motion.div 
              className="bento-card medium"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              whileHover={{ y: -5 }}
            >
              <div className="bento-content">
                <div className="bento-icon purple">
                  <Zap size={24} />
                </div>
                <h3 className="bento-title">Smart Automation</h3>
                <p className="bento-description">
                  Automated rent reminders, receipts, and reports. Save 20+ hours per month.
                </p>
                <div className="automation-tags">
                  <span className="tag">Auto-reminders</span>
                  <span className="tag">Smart receipts</span>
                  <span className="tag">Reports</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
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
                Join 50,000+ users who trust RentEase for smarter property management
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
