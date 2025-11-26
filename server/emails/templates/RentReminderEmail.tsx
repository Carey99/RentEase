import React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Link,
  Button,
} from '@react-email/components';

interface RentReminderEmailProps {
  tenantName: string;
  landlordName: string;
  landlordEmail: string;
  landlordPhone?: string;
  amountDue: number;
  dueDate: string;
  daysRemaining: number;
  propertyName: string;
  unitNumber: string;
  customMessage?: string;
  paymentUrl?: string;
}

export default function RentReminderEmail({
  tenantName,
  landlordName,
  landlordEmail,
  landlordPhone,
  amountDue,
  dueDate,
  daysRemaining,
  propertyName,
  unitNumber,
  customMessage,
  paymentUrl,
}: RentReminderEmailProps) {
  const firstName = tenantName.split(' ')[0];
  const isOverdue = daysRemaining < 0;
  const isUrgent = daysRemaining <= 1;
  const isDue = daysRemaining === 0;
  const daysOverdue = Math.abs(daysRemaining);

  // Determine heading based on status
  let heading = '';
  let messageText = '';
  
  if (isOverdue) {
    heading = daysOverdue === 1 
      ? 'Your rent is 1 day overdue.'
      : `Your rent is ${daysOverdue} days overdue.`;
    messageText = `Hello ${firstName}, your rent payment for ${propertyName}, Unit ${unitNumber} is now overdue. Please make payment as soon as possible.`;
  } else if (isDue) {
    heading = 'Your rent is due today.';
    messageText = `Hello ${firstName}, this is a reminder that your rent payment for ${propertyName}, Unit ${unitNumber} is due today.`;
  } else {
    heading = daysRemaining === 1 
      ? 'Your rent is due in 1 day.'
      : `Your rent is due in ${daysRemaining} days.`;
    messageText = `Hello ${firstName}, this is a friendly reminder about your upcoming rent payment for ${propertyName}, Unit ${unitNumber}.`;
  }

  return (
    <Html>
      <Head />
      <Preview>
        {isOverdue
          ? `Rent Payment Overdue - ${daysOverdue} ${daysOverdue === 1 ? 'Day' : 'Days'}`
          : isDue
          ? 'Rent Payment Due Today'
          : `Rent Due in ${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo/Brand */}
          <Section style={logoSection}>
            <Heading style={logo}>RENTEASE</Heading>
          </Section>

          {/* Main Heading */}
          <Heading style={h1}>
            {heading}
          </Heading>
          
          <Text style={message}>
            {messageText}
          </Text>

          {customMessage && (
            <Text style={customNote}>
              {customMessage}
            </Text>
          )}

          {/* Amount Due Box */}
          <Section style={isOverdue ? amountBoxOverdue : isUrgent ? amountBoxUrgent : amountBox}>
            <Text style={amountLabel}>{isOverdue ? 'Overdue Amount' : 'Amount Due'}</Text>
            <Text style={amountValue}>KES {amountDue.toLocaleString()}</Text>
            <Text style={dueText}>
              {isOverdue 
                ? `Was due: ${dueDate}` 
                : `Due by ${dueDate}`}
            </Text>
          </Section>

          {/* Payment Button */}
          <Section style={buttonSection}>
            <Button 
              style={isOverdue ? payButtonUrgent : payButton} 
              href={paymentUrl || 'https://rentease-e5g5.onrender.com/signin'}
            >
              {isOverdue ? 'Pay Overdue Rent Now' : 'Sign In & Pay Now'}
            </Button>
          </Section>

          {/* Contact Section */}
          <Section style={contactSection}>
            <Text style={contactLabel}>Need assistance?</Text>
            <Text style={contactDetails}>
              <Link href={`mailto:${landlordEmail}`} style={link}>{landlordEmail}</Link>
              {landlordPhone && (
                <>
                  <br />
                  <Link href={`tel:${landlordPhone}`} style={link}>{landlordPhone}</Link>
                </>
              )}
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Text style={footer}>
            {landlordName}<br />
            RentEase Property Management
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f5f5f5',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: '40px 20px',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '60px 40px',
  maxWidth: '580px',
};

const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '48px',
};

const logo = {
  color: '#666666',
  fontSize: '14px',
  fontWeight: '400',
  letterSpacing: '2px',
  margin: '0',
  textTransform: 'uppercase' as const,
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '32px',
  fontWeight: '400',
  lineHeight: '1.3',
  textAlign: 'center' as const,
  margin: '0 0 32px 0',
};

const message = {
  color: '#666666',
  fontSize: '16px',
  lineHeight: '1.6',
  textAlign: 'center' as const,
  margin: '0 0 32px 0',
};

const customNote = {
  color: '#666666',
  fontSize: '15px',
  lineHeight: '1.6',
  textAlign: 'center' as const,
  margin: '0 0 32px 0',
  fontStyle: 'italic' as const,
  padding: '0 20px',
};

const amountBox = {
  backgroundColor: '#fef9e7',
  padding: '32px',
  marginBottom: '32px',
  textAlign: 'center' as const,
};

const amountBoxUrgent = {
  backgroundColor: '#fee2e2',
  padding: '32px',
  marginBottom: '32px',
  textAlign: 'center' as const,
};

const amountBoxOverdue = {
  backgroundColor: '#fecaca',
  padding: '32px',
  marginBottom: '32px',
  textAlign: 'center' as const,
  border: '2px solid #dc2626',
};

const amountLabel = {
  color: '#666666',
  fontSize: '12px',
  fontWeight: '400',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 12px 0',
};

const amountValue = {
  color: '#1a1a1a',
  fontSize: '42px',
  fontWeight: '500',
  margin: '0 0 8px 0',
  lineHeight: '1',
};

const dueText = {
  color: '#666666',
  fontSize: '14px',
  fontWeight: '400',
  margin: '0',
};

const buttonSection = {
  textAlign: 'center' as const,
  marginBottom: '40px',
};

const payButton = {
  backgroundColor: '#1a1a1a',
  borderRadius: '4px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '500',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 48px',
  cursor: 'pointer',
};

const payButtonUrgent = {
  backgroundColor: '#dc2626',
  borderRadius: '4px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '500',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 48px',
  cursor: 'pointer',
};

const contactSection = {
  textAlign: 'center' as const,
  marginBottom: '40px',
};

const contactLabel = {
  color: '#999999',
  fontSize: '12px',
  fontWeight: '400',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 8px 0',
};

const contactDetails = {
  color: '#666666',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
};

const link = {
  color: '#4a90e2',
  textDecoration: 'none',
};

const divider = {
  borderColor: '#e5e5e5',
  borderStyle: 'solid',
  borderWidth: '1px 0 0 0',
  margin: '40px 0',
};

const footer = {
  color: '#999999',
  fontSize: '12px',
  lineHeight: '1.6',
  textAlign: 'center' as const,
  margin: '0',
};
