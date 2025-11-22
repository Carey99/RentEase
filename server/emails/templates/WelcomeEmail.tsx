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
} from '@react-email/components';

interface WelcomeEmailProps {
  tenantName: string;
  landlordName: string;
  landlordEmail: string;
  landlordPhone?: string;
  propertyName: string;
  unitNumber: string;
  rentAmount: number;
  moveInDate?: string;
  customMessage?: string;
}

export default function WelcomeEmail({
  tenantName,
  landlordName,
  landlordEmail,
  landlordPhone,
  propertyName,
  unitNumber,
  rentAmount,
  moveInDate,
  customMessage,
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to {propertyName}! 🏠</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to Your New Home!</Heading>
          
          <Text style={text}>
            Dear {tenantName},
          </Text>

          <Text style={text}>
            Welcome to <strong>{propertyName}</strong>! We're thrilled to have you as our tenant 
            and hope you'll feel right at home.
          </Text>

          {customMessage && (
            <Section style={customMessageBox}>
              <Text style={customMessageText}>{customMessage}</Text>
            </Section>
          )}

          <Section style={infoBox}>
            <Heading style={h2}>Your Tenancy Details</Heading>
            <Text style={infoText}>
              <strong>Property:</strong> {propertyName}<br />
              <strong>Unit Number:</strong> {unitNumber}<br />
              <strong>Monthly Rent:</strong> KES {rentAmount.toLocaleString()}<br />
              {moveInDate && <><strong>Move-in Date:</strong> {moveInDate}<br /></>}
              <strong>Payment Due:</strong> 1st of each month
            </Text>
          </Section>

          <Section style={infoBox}>
            <Heading style={h2}>Your Landlord</Heading>
            <Text style={infoText}>
              <strong>Name:</strong> {landlordName}<br />
              <strong>Email:</strong> <Link href={`mailto:${landlordEmail}`}>{landlordEmail}</Link><br />
              {landlordPhone && <><strong>Phone:</strong> {landlordPhone}<br /></>}
            </Text>
          </Section>

          <Text style={text}>
            If you have any questions or need assistance, please don't hesitate to reach out 
            to your landlord.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            This email was sent by RentEase Property Management System<br />
            Managed by {landlordName}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
  borderRadius: '8px',
};

const h1 = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: 'bold',
  marginBottom: '24px',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#374151',
  fontSize: '20px',
  fontWeight: 'bold',
  marginBottom: '12px',
};

const text = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
};

const infoBox = {
  backgroundColor: '#f9fafb',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '20px',
  border: '1px solid #e5e7eb',
};

const infoText = {
  color: '#4b5563',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '0',
};

const customMessageBox = {
  backgroundColor: '#eff6ff',
  padding: '16px',
  borderRadius: '8px',
  marginBottom: '20px',
  borderLeft: '4px solid #3b82f6',
};

const customMessageText = {
  color: '#1e40af',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '0',
  fontStyle: 'italic' as const,
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const footer = {
  color: '#9ca3af',
  fontSize: '14px',
  lineHeight: '20px',
  textAlign: 'center' as const,
};
