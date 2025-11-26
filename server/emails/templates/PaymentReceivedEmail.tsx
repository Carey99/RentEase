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
} from '@react-email/components';

interface PaymentReceivedEmailProps {
  tenantName: string;
  landlordName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  receiptNumber: string;
  propertyName: string;
  unitNumber: string;
  forMonth: string;
  forYear: number;
  receiptUrl?: string;
  customMessage?: string;
}

export default function PaymentReceivedEmail({
  tenantName,
  landlordName,
  amount,
  paymentDate,
  paymentMethod,
  receiptNumber,
  propertyName,
  unitNumber,
  forMonth,
  forYear,
  receiptUrl,
  customMessage,
}: PaymentReceivedEmailProps) {
  const firstName = tenantName.split(' ')[0];
  
  return (
    <Html>
      <Head />
      <Preview>Payment Received - KES {(amount || 0).toLocaleString()}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo/Brand */}
          <Section style={logoSection}>
            <Heading style={logo}>RENTEASE</Heading>
          </Section>

          {/* Success Message */}
          <Heading style={h1}>
            Payment received,<br />{firstName}.
          </Heading>
          
          <Text style={message}>
            Thank you for your payment. Your rent has been successfully received and recorded.
          </Text>

          {customMessage && (
            <Text style={customNote}>
              {customMessage}
            </Text>
          )}

          {/* Payment Summary */}
          <Section style={summaryBox}>
            <Text style={summaryAmount}>KES {(amount || 0).toLocaleString()}</Text>
            <Text style={summaryPeriod}>{forMonth} {forYear}</Text>
          </Section>

          {/* Payment Details */}
          <Section style={detailsBox}>
            <table style={detailsTable}>
              <tr>
                <td style={detailLabel}>Receipt Number</td>
                <td style={detailValue}>{receiptNumber}</td>
              </tr>
              <tr>
                <td style={detailLabel}>Payment Date</td>
                <td style={detailValue}>{paymentDate}</td>
              </tr>
              <tr>
                <td style={detailLabel}>Payment Method</td>
                <td style={detailValue}>{paymentMethod}</td>
              </tr>
              <tr>
                <td style={detailLabel}>Property</td>
                <td style={detailValue}>{propertyName}</td>
              </tr>
              <tr>
                <td style={detailLabel}>Unit</td>
                <td style={detailValue}>{unitNumber}</td>
              </tr>
            </table>
          </Section>

          <Text style={attachmentNote}>
            A detailed receipt has been attached to this email.
          </Text>

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
  margin: '0 0 32px 0',
  fontStyle: 'italic' as const,
  padding: '0 20px',
};

const summaryBox = {
  backgroundColor: '#f0fdf4',
  padding: '32px',
  marginBottom: '32px',
  textAlign: 'center' as const,
};

const summaryAmount = {
  color: '#1a1a1a',
  fontSize: '42px',
  fontWeight: '500',
  margin: '0 0 8px 0',
  lineHeight: '1',
};

const summaryPeriod = {
  color: '#666666',
  fontSize: '14px',
  fontWeight: '400',
  margin: '0',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const detailsBox = {
  backgroundColor: '#fafafa',
  padding: '32px',
  marginBottom: '32px',
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
  width: '45%',
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

const attachmentNote = {
  color: '#666666',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '0 0 32px 0',
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
