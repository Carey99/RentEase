import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Building, User, Home } from "lucide-react";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  const startOnboarding = (role: 'landlord' | 'tenant') => {
    setLocation(`/onboarding/${role}`);
  };

  const goToSignin = () => {
    setLocation('/signin');
  };

  return (
    <div className="min-h-screen">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Home className="text-primary text-2xl" />
              <span className="text-2xl font-bold text-neutral-900">RentEase</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-neutral-600 hover:text-primary transition-colors">Features</a>
              <a href="#" className="text-neutral-600 hover:text-primary transition-colors">Pricing</a>
              <a href="#" className="text-neutral-600 hover:text-primary transition-colors">About</a>
              <button 
                onClick={goToSignin}
                className="text-primary hover:text-secondary transition-colors font-medium"
                data-testid="button-signin-nav"
              >
                Sign In
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left Side - Content */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl lg:text-5xl font-bold text-neutral-900 leading-tight">
                Manage Your Rentals 
                <span className="text-primary"> Effortlessly</span>
              </h1>
              <p className="mt-6 text-lg text-neutral-600 leading-relaxed">
                Whether you're a landlord managing properties or a tenant tracking bills, RentEase simplifies your rental experience.
              </p>
            </div>
            
            <div className="space-y-4">
              <Button 
                onClick={() => startOnboarding('landlord')}
                className="w-full bg-primary hover:bg-secondary text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                data-testid="button-start-landlord"
              >
                <Building className="mr-3" />
                Start as Landlord
              </Button>
              
              <Button 
                onClick={() => startOnboarding('tenant')}
                variant="outline"
                className="w-full bg-white hover:bg-neutral-50 text-primary border-2 border-primary font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                data-testid="button-start-tenant"
              >
                <User className="mr-3" />
                Start as Tenant
              </Button>
            </div>

            <div className="text-center lg:text-left">
              <p className="text-sm text-neutral-500">
                Already have an account? 
                <button 
                  onClick={goToSignin}
                  className="text-primary hover:text-secondary font-medium transition-colors ml-1"
                  data-testid="link-signin-cta"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Hero Image */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/30"></div>
          <img 
            src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1920&h=1080" 
            alt="Modern apartment building" 
            className="w-full h-full object-cover"
          />
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
              <h2 className="text-3xl font-bold mb-4">Smart Property Management</h2>
              <p className="text-lg opacity-90">Join thousands of satisfied landlords and tenants</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
