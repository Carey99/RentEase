import React, { useEffect, useState } from 'react';
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { 
  Home, 
  Star, 
  MapPin, 
  Search, 
  Shield, 
  Clock, 
  Users, 
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Menu,
  X,
  Brain,
  Play,
  Zap
} from 'lucide-react';
import './landing.css';

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    const handleScroll = () => setScrollY(window.scrollY);
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const startOnboarding = (role: 'landlord' | 'tenant') => {
    setLocation(`/onboarding/${role}`);
  };

  const goToSignin = () => {
    setLocation('/signin');
  };

  return (
    <div className="modern-landing">
      {/* Dynamic Background */}
      <div className="bg-overlay"></div>
      <div className="animated-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Modern Navigation */}
      <nav className="modern-nav">
        <div className="nav-container">
          <div className="logo">
            <Home className="logo-icon" />
            <span className="logo-text">RentEase</span>
          </div>
          
          <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
            <a href="#features" className="nav-item">Features</a>
            <a href="#properties" className="nav-item">Properties</a>
            <a href="#testimonials" className="nav-item">Reviews</a>
            <Button onClick={goToSignin} className="nav-cta">
              Sign In
            </Button>
          </div>

          <button 
            className="mobile-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <Brain size={16} />
              <span>Next-Gen Property Management</span>
            </div>
            
            <h1 className="hero-title">
              The Future of
              <span className="gradient-text"> Rental Living</span>
            </h1>
            
            <p className="hero-description">
              Experience seamless property management with AI-powered matching, 
              instant payments, and intelligent maintenance solutions.
            </p>

            <div className="hero-actions">
              <Button 
                onClick={() => startOnboarding('landlord')}
                className="primary-btn"
                size="lg"
              >
                <Play size={20} />
                Start as Landlord
                <ArrowRight size={20} />
              </Button>
              <Button 
                onClick={() => startOnboarding('tenant')}
                className="secondary-btn"
                variant="outline"
                size="lg"
              >
                Join as Tenant
              </Button>
            </div>

            <div className="hero-stats">
              <div className="stat">
                <div className="stat-number">8K+</div>
                <div className="stat-label">Properties</div>
              </div>
              <div className="stat">
                <div className="stat-number">50K+</div>
                <div className="stat-label">Users</div>
              </div>
              <div className="stat">
                <div className="stat-number">99%</div>
                <div className="stat-label">Satisfaction</div>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="property-grid">
              <div className="property-card featured">
                <img 
                  src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?fm=webp&q=75&w=1000&fit=crop&cs=tinysrgb"
                  alt="Modern Apartment"
                  loading="lazy"
                  decoding="async"
                />
                <div className="card-content">
                  <h3>Luxury Penthouse</h3>
                  <div className="location">
                    <MapPin size={14} />
                    Westlands, Nairobi
                  </div>
                  <div className="rating">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} className="star" />
                    ))}
                  </div>
                </div>
                <div className="card-badge">Featured</div>
              </div>

              <div className="property-card">
                <img 
                  src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?fm=webp&q=75&w=1000&fit=crop&cs=tinysrgb"
                  alt="Modern House"
                  loading="lazy"
                  decoding="async"
                />
                <div className="card-content">
                  <h3>Smart Villa</h3>
                  <div className="location">
                    <MapPin size={14} />
                    Karen, Nairobi
                  </div>
                  <div className="rating">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} className="star" />
                    ))}
                  </div>
                </div>
              </div>

              <div className="property-card">
                <img 
                  src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?fm=webp&q=75&w=1000&fit=crop&cs=tinysrgb"
                  alt="Designer Loft"
                  loading="lazy"
                  decoding="async"
                />
                <div className="card-content">
                  <h3>Modern Apartment</h3>
                  <div className="location">
                    <MapPin size={14} />
                    Kilimani, Nairobi
                  </div>
                  <div className="rating">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} className="star" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Powerful Features for Modern Living</h2>
            <p className="section-subtitle">Everything you need to manage properties efficiently</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Brain />
              </div>
              <h3>AI-Powered Matching</h3>
              <p>Smart algorithms connect the right tenants with perfect properties, reducing vacancy time by 60%.</p>
              <div className="feature-stats">
                <span>60% faster matching</span>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Shield />
              </div>
              <h3>Secure Payments</h3>
              <p>M-Pesa integration with bank-level security for instant rent collection and transparent fee tracking.</p>
              <div className="feature-stats">
                <span>99.9% uptime</span>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Zap />
              </div>
              <h3>Smart Maintenance</h3>
              <p>IoT-integrated maintenance system with predictive analytics and automated service scheduling.</p>
              <div className="feature-stats">
                <span>24/7 monitoring</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="testimonials">
        <div className="container">
          <h2 className="section-title">Loved by thousands</h2>
          
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-rating">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="star" />
                ))}
              </div>
              <p>"RentEase transformed my property management. Revenue increased 40% in just 6 months."</p>
              <div className="testimonial-author">
                <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?fm=webp&q=80&w=150&fit=crop&cs=tinysrgb" alt="James Mwangi" loading="lazy" decoding="async" />
                <div>
                  <strong>James Mwangi</strong>
                  <span>Property Owner • 18 Units</span>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-rating">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="star" />
                ))}
              </div>
              <p>"Found my dream apartment in 2 days. The process was incredibly smooth and transparent."</p>
              <div className="testimonial-author">
                <img src="https://images.unsplash.com/photo-1494790108755-2616b612b786?fm=webp&q=80&w=150&fit=crop&cs=tinysrgb" alt="Grace Wanjiku" loading="lazy" decoding="async" />
                <div>
                  <strong>Grace Wanjiku</strong>
                  <span>Tenant • Westlands</span>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-rating">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="star" />
                ))}
              </div>
              <p>"The maintenance system is game-changing. Issues are resolved 3x faster than before."</p>
              <div className="testimonial-author">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fm=webp&q=80&w=150&fit=crop&cs=tinysrgb" alt="David Kiprotich" loading="lazy" decoding="async" />
                <div>
                  <strong>David Kiprotich</strong>
                  <span>Property Manager • 80+ Units</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="cta-container">
          <div className="cta-content">
            <h2>Ready to revolutionize your rental experience?</h2>
            <p>Join 50,000+ Kenyans who trust RentEase for smarter property management</p>
            
            <div className="cta-actions">
              <Button 
                onClick={() => startOnboarding('landlord')}
                className="cta-primary"
                size="lg"
              >
                Get Started Free
                <ArrowRight size={20} />
              </Button>
              <div className="cta-note">
                No credit card required • Free 30-day trial
              </div>
            </div>
          </div>
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
