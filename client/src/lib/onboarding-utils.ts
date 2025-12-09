import type { MotivationalContent } from "@/types/onboarding";
import { Home, Shield, Building2, Zap } from "lucide-react";

export function getMotivationalContent(currentStep: number): MotivationalContent {
  switch (currentStep) {
    case 1:
      return {
        icon: Home,
        title: "Welcome",
        subtitle: "Aboard!",
        description: "Join thousands of users who trust RentEase for their property management needs."
      };
    case 2:
      return {
        icon: Shield,
        title: "Security",
        subtitle: "First",
        description: "Your data is protected with enterprise-grade security. Sleep peacefully knowing your information is safe."
      };
    case 3:
      return {
        icon: Building2,
        title: "Almost",
        subtitle: "There!",
        description: "Just a few more details and you'll be ready to start managing your rental experience like a pro."
      };
    case 4:
      return {
        icon: Zap,
        title: "Final",
        subtitle: "Touch!",
        description: "Configure your utilities and complete your property setup. You're just one step away from going live!"
      };
    default:
      return {
        icon: Home,
        title: "",
        subtitle: "",
        description: ""
      };
  }
}

export function getBackgroundImage(currentStep: number): string {
  switch (currentStep) {
    case 1:
      return "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1920&h=1080";
    case 2:
      return "https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1920&h=1080";
    case 3:
      return "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1920&h=1080";
    case 4:
      return "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1920&h=1080";
    default:
      return "";
  }
}
