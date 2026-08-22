import { DocumentService } from './documentService';

export const AEROFIT_DEMO_DOCUMENTS = [
  {
    fileName: 'Return_Policy.pdf',
    fileType: 'application/pdf',
    content: `AEROFIT CUSTOMER RETURN & REFUND POLICY
Document ID: AF-POL-RET-2026
Effective Date: January 1, 2026

1. 30-DAY MONEY-BACK GUARANTEE
At AeroFit, we want you to be completely satisfied with your purchase. If you are not entirely happy with your AeroFit equipment, headphones, or fitness gear, you may return your product within 30 days of the delivery date for a full refund or exchange.

2. RETURN CONDITIONS
To qualify for a full refund under our 30-day policy:
- Products must be in like-new condition with no physical damage, deep scratches, or signs of misuse.
- The item must be returned in its original product packaging with all included accessories (cables, carrying case, power adapters, safety keys, and tools).
- Proof of purchase (order number or sales receipt) is required.

3. RETURN SHIPPING FEES
- Defective or Damaged Items: AeroFit provides a prepaid return shipping label at zero cost to the customer.
- Change of Mind Returns: The customer is responsible for standard return shipping fees, which will be deducted from the final refund amount.

4. REFUND PROCESSING TIMELINE
Once our warehouse receives and inspects your returned package (typically within 2-3 business days of arrival), your refund will be processed back to your original payment method within 5 to 7 business days.

5. NON-RETURNABLE ITEMS
For health and hygiene safety reasons, standalone replacement ear tip packs and opened wearable heart-rate chest straps that have been used are non-returnable unless defective.`,
  },
  {
    fileName: 'Warranty_Policy.pdf',
    fileType: 'application/pdf',
    content: `AEROFIT LIMITED HARDWARE & EQUIPMENT WARRANTY
Document ID: AF-POL-WAR-2026
Effective Date: January 1, 2026

1. WARRANTY PERIODS & COVERAGE
AeroFit warrants that all genuine hardware products are free from defects in materials and workmanship under normal consumer use for the following periods:
- Audio & Wearables (Headphones, Earbuds, Smart Bands): ONE (1) YEAR from the retail purchase date.
- Fitness Equipment (Treadmills, Ellipticals, Exercise Bikes, Rowers): TWO (2) YEARS from the original delivery date. Specifically, all AeroFit treadmills (including the RunPro series) carry a full 2-year warranty covering frame, motor, and electronic console components.

2. WHAT IS COVERED
Under this limited warranty, AeroFit will, at its option:
- Repair the hardware defect using new or certified refurbished replacement parts at zero cost to the owner.
- Replace the product with a brand new or functionally equivalent replacement unit.
- Dispatch certified on-site technicians for eligible treadmill frame or motor repairs within the 2-year warranty period.

3. WHAT IS NOT COVERED
This warranty does NOT cover:
- Damage caused by accident, abuse, misuse, liquid immersion exceeding rated IP ratings, or improper electrical voltage.
- Normal cosmetic wear and tear, including scratches, scuffs, and natural grip degradation.
- Products purchased from unauthorized third-party resellers, auction sites, or private sellers.

4. HOW TO INITIATE A WARRANTY CLAIM
To submit a warranty claim:
1. Contact AeroFit customer support with your original order confirmation and product serial number.
2. Provide a brief description and photo/video of the issue.
3. If approved, AeroFit will issue a Return Merchandise Authorization (RMA) or schedule an authorized technician service.`,
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
- Freight White-Glove In-Home Delivery for Treadmills & Heavy Equipment: $99.00 (includes room-of-choice placement and packaging removal).

International Shipping:
- Standard International (7-14 business days): $14.99.
- Express International DHL (3-5 business days): $29.99.

2. ORDER PROCESSING & DISPATCH CUTOFF
Orders placed Monday through Friday before 2:00 PM EST are processed and dispatched on the same business day. Heavy freight equipment ships within 2-3 business days following freight carrier scheduling.

3. TRACKING YOUR SHIPMENT
You will receive an automated shipping confirmation email with a live tracking link as soon as your order is dispatched.`,
  },
  {
    fileName: 'Product_Manual.pdf',
    fileType: 'application/pdf',
    content: `AEROFIT RUNPRO T100 TREADMILL & PRO AUDIO USER GUIDE
Document ID: AF-MAN-RUN-2026
Revision: 3.1

1. AEROFIT RUNPRO T100 TREADMILL SPECIFICATIONS
- Motor: 3.5 CHP Commercial-Grade WhisperQuiet Motor
- Speed Range: 0.5 - 12.0 MPH with quick-touch console buttons
- Incline Range: 0 - 15% motorized incline
- Running Belt: 20" x 60" Multi-Ply Orthopedic Shock Absorption Deck
- Maximum User Weight: 350 lbs (158 kg)
- Display: 10-inch Full-Color HD Touchscreen with built-in workout analytics and Bluetooth 5.3 heart rate connectivity
- Folding Mechanism: EasyLift Hydraulic Assist folding frame for compact vertical storage
- Note: Official retail pricing, financing options, and seasonal promotional bundles vary by authorized dealer and retail store location.

2. MAINTENANCE & DECK LUBRICATION
- Lubrication Schedule: Apply 100% silicone treadmill lubricant every 3 months or 150 hours of active use.
- Belt Alignment: If the running belt drifts to either side, use the included 6mm Allen wrench on the rear roller adjustment bolts to center the belt while running at 2.0 MPH.

3. AEROFIT PRO WIRELESS HEADPHONES SPECIFICATIONS
- Driver Size: 40mm Custom High-Fidelity Dynamic Drivers
- Battery Life: Up to 25 hours with Active Noise Cancellation (ANC) enabled, 30 hours with ANC off.
- Charging: USB Type-C fast charge; 10 minutes provides 4 hours of music playback.
- Water Resistance: IPX7 sweatproof and water-resistant.`,
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
        mimetype: 'application/pdf',
        size: buffer.length,
      },
      true // waitForIndexing
    );
    loadedDocs.push(uploadedDoc);
  }

  return loadedDocs;
}
