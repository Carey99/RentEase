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
  const firstName = tenantName.split(' ')[0];
  
  return (
    <Html>
      <Head />
      <Preview>Welcome to {propertyName}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo/Brand */}
          <Section style={logoSection}>
            <Heading style={logo}>RENTEASE</Heading>
          </Section>

          {/* Main Heading */}
          <Heading style={h1}>
            We're glad you<br />are here.
          </Heading>
          
          {/* Main Message */}
          <Text style={message}>
            Welcome to {propertyName}, {firstName}. Your rental account has been set up successfully.
          </Text>

          {customMessage && (
            <Text style={customNote}>
              {customMessage}
            </Text>
          )}

          {/* Property Details Box */}
          <Section style={detailsBox}>
            <table style={detailsTable}>
              <tr>
                <td style={detailLabel}>Property</td>
                <td style={detailValue}>{propertyName}</td>
              </tr>
              <tr>
                <td style={detailLabel}>Unit Number</td>
                <td style={detailValue}>{unitNumber}</td>
              </tr>
              <tr>
                <td style={detailLabel}>Monthly Rent</td>
                <td style={detailValue}>KES {(rentAmount || 0).toLocaleString()}</td>
              </tr>
              {moveInDate && (
                <tr>
                  <td style={detailLabel}>Move-in Date</td>
                  <td style={detailValue}>{moveInDate}</td>
                </tr>
              )}
            </table>
          </Section>

          {/* Contact Section */}
          <Section style={contactSection}>
            <Text style={contactLabel}>Property Manager</Text>
            <Text style={contactName}>{landlordName}</Text>
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
  fontSize: '36px',
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
  margin: '0 0 40px 0',
  fontStyle: 'italic' as const,
  padding: '0 20px',
};

const detailsBox = {
  backgroundColor: '#fafafa',
  padding: '32px',
  marginBottom: '40px',
};

const detailsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const detailLabel = {
  color: '#999999',
  fontSize: '13px',
  fontWeight: '400',
  paddingBottom: '16px',
  paddingTop: '16px',
  textAlign: 'left' as const,
  verticalAlign: 'top' as const,
  width: '40%',
};

const detailValue = {
  color: '#1a1a1a',
  fontSize: '15px',
  fontWeight: '500',
  paddingBottom: '16px',
  paddingTop: '16px',
  textAlign: 'right' as const,
  verticalAlign: 'top' as const,
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

const contactName = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: '500',
  margin: '0 0 12px 0',
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
  textAlign: 'center' as const,
  margin: '0',
};
