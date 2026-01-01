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
  const [isPremiumCtaDropdownOpen, setIsPremiumCtaDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([0, 1, 2, 3]);
  const [hoveredMockup, setHoveredMockup] = useState<number | null>(null);
  const hasLoadedOnce = React.useRef(false);

  // Ref for the features section to track scroll progress
  const featuresRef = React.useRef<HTMLDivElement>(null);
  const heroRef = React.useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: featuresRef,
    offset: ["start end", "end start"]
  });

  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  // Create parallax transforms for each mockup outside of render
  const yOffset0 = useTransform(scrollYProgress, [0, 1], [0, 0]);
  const yOffset1 = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const yOffset2 = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const yOffset3 = useTransform(scrollYProgress, [0, 1], [150, -150]);
  
  // Alternating rotation with increased amplitude: right, left, right, left
  const rotate0 = useTransform(scrollYProgress, [0, 0.5, 1], [-15, -5, 10]);
  const rotate1 = useTransform(scrollYProgress, [0, 0.5, 1], [-10, 0, -15]);
  const rotate2 = useTransform(scrollYProgress, [0, 0.5, 1], [5, 12, 20]);
  const rotate3 = useTransform(scrollYProgress, [0, 0.5, 1], [15, 5, -10]);
  
  const mockupOffsets = [yOffset0, yOffset1, yOffset2, yOffset3];
  const mockupRotations = [rotate0, rotate1, rotate2, rotate3];

  // Hero section parallax effects
  const heroTextY = useTransform(heroScrollProgress, [0, 1], [0, -100]);
  const heroTextOpacity = useTransform(heroScrollProgress, [0, 0.5], [1, 0]);
  const heroImageY = useTransform(heroScrollProgress, [0, 1], [0, -150]);
  const heroImageScale = useTransform(heroScrollProgress, [0, 1], [1, 0.9]);
  const heroImageRotate = useTransform(heroScrollProgress, [0, 1], [0, -5]);

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

  // Show all 4 mockups by default - no scroll triggers for now

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
              src={'/images/tranparent_logo.webp'}
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
      <section className="hero-section" ref={heroRef}>
        <div className="hero-content-wrapper">
          <motion.div 
            className="hero-left"
            style={{ 
              y: heroTextY,
              opacity: heroTextOpacity
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              
              <h1 className="hero-headline">
                Built for every stage of
                <span className="gradient-text-premium"> property management</span>
              </h1>
              
              <p className="hero-subheadline">
                From rent collection to tenant placement. 
                Seamless payments, real-time insights, and zero hassle.
                Everything works together.
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
                  <span>Start for free</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Center Divider with Lines and Text */}
          <div className="hero-center-divider">
            <div className="divider-line divider-line-1"></div>
            <div className="divider-line divider-line-2"></div>
            <div className="divider-text-wrapper">
              {['R', 'e', 'n', 't', 'E', 'a', 's', 'e'].map((letter, index) => (
                <motion.span
                  key={index}
                  className="divider-letter"
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    delay: index * 0.1,
                    duration: 0.5,
                    ease: [0.34, 1.56, 0.64, 1]
                  }}
                  whileInView={
                    hasLoadedOnce.current 
                      ? {
                          scale: [0, 1.3, 1],
                          opacity: [0, 1, 1]
                        }
                      : undefined
                  }
                  viewport={{ once: false, amount: 0.8 }}
                  onViewportEnter={() => {
                    if (!hasLoadedOnce.current) {
                      hasLoadedOnce.current = true;
                    }
                  }}
                  onAnimationComplete={() => {
                    if (!hasLoadedOnce.current) {
                      hasLoadedOnce.current = true;
                    }
                  }}
                >
                  {letter}
                </motion.span>
              ))}
            </div>
            <div className="divider-line divider-line-3"></div>
            <div className="divider-line divider-line-4"></div>
          </div>

          <motion.div 
            className="hero-right"
            style={{ 
              y: heroImageY,
              scale: heroImageScale,
              rotate: heroImageRotate
            }}
          >
            {/* Hero Image */}
            <div className="hero-image-wrapper">
              <img 
                src="/images/Herobg.png" 
                alt="Property management" 
                className="hero-main-image"
              />
            </div>
          </motion.div>
        </div>

      </section>

      {/* Premium Feature Section */}
      <section className="premium-features-section" ref={featuresRef}>
        <div className="premium-features-container">
          {/* Large Background Text with Gradient Mask */}
          <div className="background-text-wrapper">
            <h2 className="background-text-gradient">Living</h2>
          </div>

          <motion.div 
            className="section-intro"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="section-intro-title">Built for modern property management</h2>
            <p className="section-intro-subtitle">Everything you need to run your rental business, all in one place</p>
          </motion.div>

          <div className="features-scroll-container">
            {/* Sticky Left Visual with Stacking Mockups */}
            <div className="sticky-visual-column">
              <div className="mockups-stack-container">
                {[0, 1, 2, 3].map((stepIndex) => (
                  <div
                    key={stepIndex}
                    className={`feature-mockup stacked-mockup mockup-${stepIndex} ${hoveredMockup === stepIndex ? 'hovered' : ''} ${hoveredMockup !== null && hoveredMockup !== stepIndex ? 'dimmed' : ''}`}
                    onMouseEnter={() => setHoveredMockup(stepIndex)}
                    onMouseLeave={() => setHoveredMockup(null)}
                  >
                    <motion.img 
                      src={
                        stepIndex === 0 ? '/images/onemck.png?v=1' :
                        stepIndex === 1 ? '/images/mck4.png?v=1' :
                        stepIndex === 2 ? '/images/mck3.png?v=1' :
                        '/images/lmck.png?v=1'
                      }
                      alt={`${
                        stepIndex === 0 ? 'Rent cycle tracking' :
                        stepIndex === 1 ? 'Payment matching' :
                        stepIndex === 2 ? 'Property management' :
                        'Unified dashboard'
                      }`}
                      className="mockup-image"
                      style={{ 
                        y: mockupOffsets[stepIndex],
                        rotate: mockupRotations[stepIndex],
                        scale: hoveredMockup === stepIndex ? 1.08 : 1
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Scrollable Right Content */}
            <div className="scroll-content-column">
              <motion.div 
                className="feature-step"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.6 }}
                transition={{ duration: 0.6 }}
              >
                <div className="step-number">01</div>
                <h3 className="step-title">Never miss a rent cycle</h3>
                <p className="step-description">
                  Automated rent tracking that keeps payments on time and visible. 
                  From billing to reminders to overdue tracking, we run your rent cycle 
                  automatically, every month, without follow-ups.
                </p>
              </motion.div>

              <motion.div 
                className="feature-step"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.6 }}
                transition={{ duration: 0.6 }}
              >
                <div className="step-number">02</div>
                <h3 className="step-title">Payments matched instantly</h3>
                <p className="step-description">
                  Incoming payments are automatically linked to the right tenant and unit. 
                  Upload your M-Pesa statement and RentEase does the rest, matching payments 
                  to tenants accurately and updating balances in real time.
                </p>
              </motion.div>

              <motion.div 
                className="feature-step"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.6 }}
                transition={{ duration: 0.6 }}
              >
                <div className="step-number">03</div>
                <h3 className="step-title">Vacancy to tenant, faster</h3>
                <p className="step-description">
                  Move from listing to occupied without switching tools. List vacant units 
                  once and RentEase markets them for you. Interested home-finders apply 
                  directly, and landlords get notified instantly.
                </p>
              </motion.div>

              <motion.div 
                className="feature-step feature-step-final"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.6 }}
                transition={{ duration: 0.6 }}
              >
                <div className="step-number">04</div>
                <h3 className="step-title">One system. Zero guesswork.</h3>
                <p className="step-description">
                  Everything landlords and tenants need, working together. No more scattered 
                  spreadsheets, missed payments, or manual reconciliation. Just seamless 
                  property management that actually works.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>


      {/* Application Flow Section */}
      <section id="features" className="flow-section">
        {/* Large Background Text with Gradient Mask */}
        <div className="flow-background-text-wrapper">
          <h2 className="background-text-gradient">Works</h2>
        </div>

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
            src="/images/svgflownew.svg" 
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
            style={{
              backgroundImage: 'url(/images/ctabg.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
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
                <img 
                  src="/images/dark_logoRE.webp" 
                  alt="RentEase" 
                  className="footer-logo-image"
                />
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
            <p>&copy; {new Date().getFullYear()} RentEase. All rights reserved.</p>
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
