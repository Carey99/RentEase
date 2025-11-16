import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";

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
    <div className="flex min-h-screen">
      {/* Left Side - Sign In Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-white">
        <div className="max-w-md w-full">
          {/* Logo and Back Button */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-neutral-900">RentEase</span>
            </div>
            <Button
              variant="ghost"
              onClick={goBack}
              className="text-neutral-500 hover:text-neutral-700"
              data-testid="button-back-to-landing"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Welcome Back Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Welcome Back!</h2>
            <p className="text-neutral-600">Sign in to your RentEase account to continue.</p>
          </div>

          {/* Sign In Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="email">Email Address</Label>
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
              <Label htmlFor="password">Password</Label>
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
                className="text-sm font-normal text-neutral-600 cursor-pointer"
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
            <p className="text-neutral-600 text-sm">
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
      <div className="flex-1 relative hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-secondary/50"></div>
        <img 
          src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1920&h=1080"
          alt="Welcome back to RentEase" 
          className="w-full h-full object-cover"
        />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white p-8 max-w-md">
            <div className="text-6xl mb-6 opacity-90">
              🏠
            </div>
            <h2 className="text-3xl font-bold mb-4">Welcome Back!</h2>
            <p className="text-lg opacity-90">
              Continue managing your rental properties and tenant relationships with ease.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
