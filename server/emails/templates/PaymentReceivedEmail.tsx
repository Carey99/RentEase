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
  Button,
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
  return (
    <Html>
      <Head />
      <Preview>Payment Received - KES {amount.toLocaleString()} ✅</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={successBanner}>
            <Heading style={h1}>Payment Received! ✅</Heading>
          </Section>
          
          <Text style={text}>
            Dear {tenantName},
          </Text>

          <Text style={text}>
            Thank you! Your rent payment has been successfully received and recorded.
          </Text>

          {customMessage && (
            <Section style={customMessageBox}>
              <Text style={customMessageText}>{customMessage}</Text>
            </Section>
          )}

          <Section style={paymentBox}>
            <Heading style={h2}>Payment Details</Heading>
            <table style={table}>
              <tbody>
                <tr>
                  <td style={labelCell}>Amount Paid:</td>
                  <td style={valueCell}><strong>KES {amount.toLocaleString()}</strong></td>
                </tr>
                <tr>
                  <td style={labelCell}>Payment Date:</td>
                  <td style={valueCell}>{paymentDate}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Payment Method:</td>
                  <td style={valueCell}>{paymentMethod}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Receipt Number:</td>
                  <td style={valueCell}>{receiptNumber}</td>
                </tr>
                <tr>
                  <td style={labelCell}>For Period:</td>
                  <td style={valueCell}>{forMonth} {forYear}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={propertyBox}>
            <Heading style={h3}>Property Information</Heading>
            <Text style={infoText}>
              <strong>Property:</strong> {propertyName}<br />
              <strong>Unit:</strong> {unitNumber}
            </Text>
          </Section>

          {receiptUrl && (
            <Section style={buttonContainer}>
              <Button style={button} href={receiptUrl}>
                Download Receipt (PDF)
              </Button>
            </Section>
          )}

          <Text style={text}>
            Your payment history is always available in your tenant dashboard.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Thank you for being a valued tenant!<br />
            {landlordName}<br />
            <em>via RentEase Property Management</em>
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

const successBanner = {
  backgroundColor: '#10b981',
  padding: '20px',
  borderRadius: '8px 8px 0 0',
  marginTop: '-40px',
  marginLeft: '-20px',
  marginRight: '-20px',
  marginBottom: '24px',
};

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  marginBottom: '0',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#374151',
  fontSize: '20px',
  fontWeight: 'bold',
  marginBottom: '16px',
};

const h3 = {
  color: '#374151',
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '12px',
};

const text = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
};

const paymentBox = {
  backgroundColor: '#f9fafb',
  padding: '24px',
  borderRadius: '8px',
  marginBottom: '20px',
  border: '2px solid #10b981',
};

const propertyBox = {
  backgroundColor: '#f9fafb',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '20px',
  border: '1px solid #e5e7eb',
};

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const labelCell = {
  color: '#6b7280',
  fontSize: '15px',
  padding: '8px 0',
  width: '40%',
};

const valueCell = {
  color: '#1f2937',
  fontSize: '15px',
  padding: '8px 0',
  textAlign: 'right' as const,
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

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
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
