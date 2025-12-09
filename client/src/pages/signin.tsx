import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Eye, EyeOff, LogIn, Home, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getSessionPropertyImage } from "@/lib/property-images";
import { useImagePreload } from "@/hooks/useImagePreload";

const signinSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type SigninFormData = z.infer<typeof signinSchema>;

export default function SigninPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get a random property image for this session
  const propertyImage = useMemo(() => getSessionPropertyImage(), []);
  
  // Preload the image for smooth rendering
  const { isLoaded: imageLoaded } = useImagePreload(propertyImage.url);

  const form = useForm<SigninFormData>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: SigninFormData) => {
    setIsLoading(true);
    const success = await login(data.email, data.password, data.rememberMe || false);
    setIsLoading(false);

    if (success) {
      // Get user from localStorage to determine role
      const userData = localStorage.getItem("rentease_user");
      if (userData) {
        const user = JSON.parse(userData);
        setLocation(`/dashboard/${user.role}`);
      }
    }
  };

  const goBack = () => {
    setLocation('/');
  };

  const goToSignup = () => {
    setLocation('/');
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950">
      {/* Left Side - Sign In Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-white dark:bg-slate-950">
        <div className="max-w-md w-full">
          {/* Logo and Back Button */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-neutral-900 dark:text-white">RentEase</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                onClick={goBack}
                className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                data-testid="button-back-to-landing"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Welcome Back Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Welcome Back!</h2>
            <p className="text-neutral-600 dark:text-neutral-400">Sign in to your RentEase account to continue.</p>
          </div>

          {/* Sign In Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="email" className="mb-1.5 block">Email Address</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder="john@example.com"
                data-testid="input-email"
                className="mt-1"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="mb-1.5 block">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...form.register("password")}
                  placeholder="Enter your password"
                  data-testid="input-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={form.watch("rememberMe")}
                onCheckedChange={(checked) => form.setValue("rememberMe", checked as boolean)}
                data-testid="checkbox-remember-me"
              />
              <Label
                htmlFor="rememberMe"
                className="text-sm font-normal text-neutral-600 dark:text-neutral-400 cursor-pointer"
              >
                Remember me for 30 days
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-secondary text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
              disabled={isLoading}
              data-testid="button-signin"
            >
              {isLoading ? "Signing in..." : "Sign In"}
              {!isLoading && <LogIn className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-neutral-600 dark:text-neutral-400 text-sm">
              Don't have an account?{" "}
              <Button
                variant="link"
                onClick={goToSignup}
                className="text-primary hover:text-secondary font-semibold p-0"
                data-testid="link-signup"
              >
                Sign up here
              </Button>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Motivational Image */}
      <div className="flex-1 relative hidden lg:block overflow-hidden bg-slate-100 dark:bg-slate-900">
        {/* Blur placeholder - shows instantly */}
        {propertyImage.blurDataUrl && (
          <img 
            src={propertyImage.blurDataUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl"
            aria-hidden="true"
          />
        )}
        
        {/* Main high-quality image */}
        <img 
          src={propertyImage.url}
          alt={propertyImage.alt}
          className={`relative w-full h-full object-cover transition-opacity duration-700 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          loading="eager"
          decoding="async"
          fetchpriority="high"
        />
        
        {/* Left-to-Right Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
        
        <div className="absolute inset-0 flex items-center">
          <div className="text-white p-12 max-w-xl">
            {/* Icon with frosted glass backdrop */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-8">
              <Home className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
            
            {/* Split headline with accent */}
            <h2 className="text-5xl font-bold mb-3 leading-tight">
              <span className="text-white drop-shadow-lg">Welcome</span>{' '}
              <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
                Back!
              </span>
            </h2>
            
            <p className="text-lg text-gray-100 leading-relaxed drop-shadow-md">
              Continue managing your rental properties and tenant relationships with ease.
            </p>
            
            {/* Visual accent line */}
            <div className="mt-6 w-20 h-1 bg-gradient-to-r from-blue-500 to-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
