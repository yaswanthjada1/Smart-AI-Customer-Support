import { DocumentService } from './documentService';

export const AEROFIT_DEMO_DOCUMENTS = [
  {
    fileName: 'Return_Policy.pdf',
    fileType: 'application/pdf',
    content: `AEROFIT CUSTOMER RETURN & REFUND POLICY
Document ID: AF-POL-RET-2026
Effective Date: January 1, 2026

1. 30-DAY MONEY-BACK GUARANTEE
At AeroFit, we want you to be completely satisfied with your purchase. If you are not entirely happy with your AeroFit headphones, earbuds, or fitness gear, you may return your product within 30 days of the delivery date for a full refund or exchange.

2. RETURN CONDITIONS
To qualify for a full refund under our 30-day policy:
- Products must be in like-new condition with no physical damage, deep scratches, or signs of misuse.
- The item must be returned in its original product packaging with all included accessories (cables, carrying case, adapters, and ear tips).
- Proof of purchase (order number or sales receipt) is required.

3. RETURN SHIPPING FEES
- Defective or Damaged Items: AeroFit provides a prepaid return shipping label at zero cost to the customer.
- Change of Mind Returns: The customer is responsible for the standard return shipping fee of $5.99, which is deducted from the final refund amount.

4. REFUND PROCESSING TIMELINE
Once our warehouse receives and inspects your returned package (typically within 2-3 business days of arrival), your refund will be processed back to your original payment method. Please allow 5 to 7 business days for the funds to reflect on your bank or credit card statement.

5. NON-RETURNABLE ITEMS
For health and hygiene safety reasons, standalone replacement ear tip packs that have been opened are non-returnable unless defective. Promotional gift cards are non-refundable.`,
  },
  {
    fileName: 'Warranty_Policy.pdf',
    fileType: 'application/pdf',
    content: `AEROFIT 1-YEAR LIMITED HARDWARE WARRANTY
Document ID: AF-POL-WAR-2026
Effective Date: January 1, 2026

1. WARRANTY COVERAGE
AeroFit warrants all hardware products against defects in materials and workmanship for a period of ONE (1) YEAR from the original retail purchase date by the original end-user purchaser ("Warranty Period").

2. WHAT IS COVERED
Under this limited warranty, AeroFit will, at its option:
- Repair the hardware defect using new or refurbished replacement parts at no charge.
- Replace the product with a new or functionally equivalent replacement unit.
- Refund the original purchase price if repair or replacement is not commercially feasible.

3. WHAT IS NOT COVERED
This warranty does NOT cover:
- Damage caused by accident, abuse, misuse, fire, earthquake, or other external causes.
- Liquid immersion exceeding the specified IPX7 water resistance rating.
- Normal cosmetic wear and tear, including scratches, dents, and broken plastic on ports over time.
- Damage caused by service performed by anyone who is not an authorized AeroFit service provider.
- Products purchased from unauthorized third-party resellers or auction websites.

4. HOW TO INITIATE A WARRANTY CLAIM
To submit a warranty claim:
1. Contact AeroFit customer support with your original order number and product serial number.
2. Provide a brief description and photo/video of the defect.
3. If approved, AeroFit will issue a Return Merchandise Authorization (RMA) number and prepaid shipping instructions.
4. Warranty service is completed within 7 to 10 business days of product receipt.`,
  },
  {
    fileName: 'Shipping_Policy.pdf',
    fileType: 'application/pdf',
    content: `AEROFIT GLOBAL SHIPPING & DELIVERY GUIDELINES
Document ID: AF-POL-SHP-2026
Effective Date: January 1, 2026

1. SHIPPING RATES & DELIVERY ESTIMATES
AeroFit ships to all 50 U.S. states and over 45 international destinations.

Domestic Shipping (Contiguous United States):
- Standard Shipping (3-5 business days): $4.99, or FREE on all orders over $50.00.
- Express 2-Day Shipping (2 business days): $12.99.
- Overnight Priority Shipping (Next business day): $24.99.

International Shipping:
- Standard International (7-14 business days): $14.99.
- Express International DHL (3-5 business days): $29.99.

2. ORDER PROCESSING & DISPATCH CUTOFF
Orders placed Monday through Friday before 2:00 PM EST are processed and dispatched on the same business day. Orders placed after 2:00 PM EST, on weekends, or on federal holidays will ship the following business day.

3. TRACKING YOUR SHIPMENT
You will receive an automated shipping confirmation email with a live tracking number as soon as your order leaves our distribution center. Tracking updates typically become active within 24 hours of dispatch.

4. MISSING OR DAMAGED PACKAGES
If your tracking status shows "Delivered" but you cannot locate your package, please check around your delivery area, porch, and with neighbors. If you still have not located your package within 48 hours of marked delivery, contact support@aerofit.com to initiate an investigation and replacement dispatch.`,
  },
  {
    fileName: 'Product_Manual.pdf',
    fileType: 'application/pdf',
    content: `AEROFIT PRO WIRELESS HEADPHONES — USER MANUAL & SPECIFICATIONS
Model: AF-PRO-H1
Revision: 2.4

1. PRODUCT OVERVIEW & SPECIFICATIONS
- Driver Size: 40mm Custom High-Fidelity Dynamic Drivers
- Frequency Response: 20Hz - 20,000Hz
- Bluetooth Version: Bluetooth 5.3 (Operating range up to 15 meters / 50 feet)
- Audio Codecs: AAC, SBC, aptX HD
- Battery Capacity: 750mAh Lithium-Polymer
- Water & Sweat Resistance: IPX7 Rated
- Weight: 245 grams

2. BATTERY LIFE & CHARGING
- Playback Time (ANC On): Up to 25 hours continuous playback.
- Playback Time (ANC Off): Up to 30 hours continuous playback.
- Charging Interface: USB Type-C (5V/1A).
- Full Charge Time: Approximately 2 hours from 0% to 100%.
- Fast Fuel Quick Charge: 10 minutes of charging gives approximately 4 hours of music playback.

3. BLUETOOTH PAIRING INSTRUCTIONS
1. Ensure the headphones are powered off.
2. Press and hold the Multi-Function Power Button for 5 seconds until the LED indicator flashes alternately RED and BLUE and you hear "Pairing".
3. Open Bluetooth settings on your smartphone, tablet, or laptop.
4. Select "AeroFit Pro" from the list of available devices.
5. Once connected, the LED indicator will turn solid BLUE and you hear "Connected".

4. ACTIVE NOISE CANCELLATION (ANC) CONTROLS
Press the dedicated ANC Button on the left earcup to cycle through audio modes:
- Mode 1: Active Noise Cancellation ON (Blocks ambient environmental noise).
- Mode 2: Transparency Mode (Amplifies voices and traffic sounds for safety).
- Mode 3: Normal / ANC OFF (Standard passive isolation).

5. RESETTING TO FACTORY DEFAULT
If you experience pairing difficulties or audio imbalance:
1. Power on the headphones.
2. Press and hold the Volume Up (+) and Volume Down (-) buttons simultaneously for 7 seconds until the LED flashes purple 3 times.
3. The headphones will reboot into default factory pairing mode.`,
  },
];

export async function loadAeroFitDemoDocuments(companyId: string) {
  const loadedDocs = [];

  for (const doc of AEROFIT_DEMO_DOCUMENTS) {
    const buffer = Buffer.from(doc.content, 'utf8');
    const uploadedDoc = await DocumentService.uploadAndProcessDocument(
      companyId,
      {
        originalname: doc.fileName,
        buffer,
        mimetype: 'text/plain',
        size: buffer.length,
      },
      true // waitForIndexing
    );
    loadedDocs.push(uploadedDoc);
  }

  return loadedDocs;
}
