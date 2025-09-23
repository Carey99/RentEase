import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, MessageSquare, Mail, Phone, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReminderDropdownProps {
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone?: string;
  debtAmount: number;
}

export default function ReminderDropdown({
  tenantId,
  tenantName,
  tenantEmail,
  tenantPhone,
  debtAmount
}: ReminderDropdownProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleReminderSend = async (method: 'sms' | 'email' | 'whatsapp') => {
    setIsLoading(true);
    
    // Simulate sending reminder (placeholder for future implementation)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const methodLabels = {
      sms: 'SMS',
      email: 'Email',
      whatsapp: 'WhatsApp'
    };

    // Show toast notification
    toast({
      title: "Reminder Feature Coming Soon",
      description: `${methodLabels[method]} reminder to ${tenantName} about KSH ${debtAmount.toLocaleString()} debt will be available soon.`,
      duration: 3000,
    });

    setIsLoading(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={isLoading}
          className="h-8"
        >
          Send Reminder
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={() => handleReminderSend('email')}
          disabled={!tenantEmail}
        >
          <Mail className="mr-2 h-4 w-4" />
          Send Email
          {!tenantEmail && <span className="ml-2 text-xs text-muted-foreground">(No email)</span>}
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleReminderSend('sms')}
          disabled={!tenantPhone}
        >
          <Phone className="mr-2 h-4 w-4" />
          Send SMS
          {!tenantPhone && <span className="ml-2 text-xs text-muted-foreground">(No phone)</span>}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => handleReminderSend('whatsapp')}
          disabled={!tenantPhone}
        >
          <Smartphone className="mr-2 h-4 w-4" />
          Send WhatsApp
          {!tenantPhone && <span className="ml-2 text-xs text-muted-foreground">(No phone)</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}