import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting EcoPulse AI database seeding...");

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { id: "demo-org-greenvalley" },
    update: {},
    create: {
      id: "demo-org-greenvalley",
      name: "Green Valley Educational Campus",
      organizationType: "Educational Campus / University",
      location: "Oakridge Hills, Sector 4B",
    },
  });

  console.log(`✅ Organization created: ${org.name}`);

  // 2. Create Demo Users
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash("Admin@EcoPulse2025", salt);
  const managerPasswordHash = await bcrypt.hash("Manager@EcoPulse2025", salt);
  const viewerPasswordHash = await bcrypt.hash("Viewer@EcoPulse2025", salt);

  await prisma.user.upsert({
    where: { email: "admin@ecopulse.ai" },
    update: { passwordHash: adminPasswordHash },
    create: {
      name: "Dr. Elena Vance (Campus Administrator)",
      email: "admin@ecopulse.ai",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      organizationId: org.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@ecopulse.ai" },
    update: { passwordHash: managerPasswordHash },
    create: {
      name: "Marcus Holloway (Sustainability Officer)",
      email: "manager@ecopulse.ai",
      passwordHash: managerPasswordHash,
      role: "MANAGER",
      organizationId: org.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "viewer@ecopulse.ai" },
    update: { passwordHash: viewerPasswordHash },
    create: {
      name: "Aria Thorne (Faculty / Student Representative)",
      email: "viewer@ecopulse.ai",
      passwordHash: viewerPasswordHash,
      role: "VIEWER",
      organizationId: org.id,
    },
  });

  console.log("✅ Demo users created (admin, manager, viewer).");

  // 3. Create Buildings
  const buildingsData = [
    {
      code: "MAB-01",
      name: "Main Academic Block",
      location: "North Quad",
      areaSqFt: 85000,
      occupancy: 2200,
      operatingSchedule: "07:30 - 19:30, Mon-Fri; 09:00 - 14:00, Sat",
      status: "ACTIVE",
    },
    {
      code: "ENG-02",
      name: "Engineering & Tech Complex",
      location: "East Tech Hub",
      areaSqFt: 65000,
      occupancy: 1400,
      operatingSchedule: "08:00 - 21:00, Mon-Fri; 09:00 - 17:00, Sat",
      status: "ACTIVE",
    },
    {
      code: "SCI-03",
      name: "Science Research Laboratories",
      location: "South Research Circle",
      areaSqFt: 50000,
      occupancy: 900,
      operatingSchedule: "08:00 - 22:00, Mon-Sat (Continuous ventilation)",
      status: "ACTIVE",
    },
    {
      code: "LIB-04",
      name: "Central Library & Media Center",
      location: "Central Commons",
      areaSqFt: 38000,
      occupancy: 750,
      operatingSchedule: "08:00 - 23:00, Daily",
      status: "ACTIVE",
    },
    {
      code: "HST-05",
      name: "Student Residential Hostel (Blocks A-D)",
      location: "West Residential Village",
      areaSqFt: 110000,
      occupancy: 1800,
      operatingSchedule: "24/7 Residential",
      status: "ACTIVE",
    },
    {
      code: "CAF-06",
      name: "Campus Cafeteria & Dining Commons",
      location: "South Commons",
      areaSqFt: 25000,
      occupancy: 1500,
      operatingSchedule: "06:30 - 22:00, Daily",
      status: "ACTIVE",
    },
  ];

  const buildings: Record<string, string> = {};
  for (const b of buildingsData) {
    const record = await prisma.building.upsert({
      where: {
        organizationId_code: {
          organizationId: org.id,
          code: b.code,
        },
      },
      update: {
        name: b.name,
        location: b.location,
        areaSqFt: b.areaSqFt,
        occupancy: b.occupancy,
        operatingSchedule: b.operatingSchedule,
      },
      create: {
        organizationId: org.id,
        code: b.code,
        name: b.name,
        location: b.location,
        areaSqFt: b.areaSqFt,
        occupancy: b.occupancy,
        operatingSchedule: b.operatingSchedule,
      },
    });
    buildings[b.code] = record.id;
  }

  console.log("✅ 6 Campus buildings created.");

  // 4. Configure Emission Factors
  const defaultFactors = [
    {
      resourceType: "ELECTRICITY",
      factorValue: 0.42,
      factorUnit: "kg CO2e/kWh",
      source: "IEA & EPA eGRID Regional Grid Average (2024 - Illustrative)",
    },
    {
      resourceType: "WATER",
      factorValue: 0.00035,
      factorUnit: "kg CO2e/L",
      source: "UK DEFRA & EPA Municipal Pumping & Treatment Standards",
    },
    {
      resourceType: "WASTE_ORGANIC",
      factorValue: 0.06,
      factorUnit: "kg CO2e/kg",
      source: "EPA WARM Composting Lifecycle Model",
    },
    {
      resourceType: "WASTE_PLASTIC",
      factorValue: 0.09,
      factorUnit: "kg CO2e/kg",
      source: "Mechanical Recycling Processing Emission Model",
    },
    {
      resourceType: "WASTE_LANDFILL",
      factorValue: 0.58,
      factorUnit: "kg CO2e/kg",
      source: "IPCC Guidelines for Unmanaged Solid Waste Disposal",
    },
    {
      resourceType: "WASTE_GENERAL",
      factorValue: 0.45,
      factorUnit: "kg CO2e/kg",
      source: "Mixed Municipal Solid Waste Average Baseline",
    },
  ];

  for (const f of defaultFactors) {
    await prisma.emissionFactor.upsert({
      where: {
        organizationId_resourceType: {
          organizationId: org.id,
          resourceType: f.resourceType,
        },
      },
      update: {
        factorValue: f.factorValue,
        factorUnit: f.factorUnit,
        source: f.source,
      },
      create: {
        organizationId: org.id,
        resourceType: f.resourceType,
        factorValue: f.factorValue,
        factorUnit: f.factorUnit,
        source: f.source,
        isDefault: true,
      },
    });
  }

  console.log("✅ Configurable emission factors initialized.");

  // 5. Clean prior demo records to allow clean idempotency
  await prisma.resourceRecord.deleteMany({
    where: { organizationId: org.id, dataSource: "DEMO_SIMULATION" },
  });
  await prisma.wasteRecord.deleteMany({
    where: { organizationId: org.id, dataSource: "DEMO_SIMULATION" },
  });
  await prisma.anomaly.deleteMany({
    where: { organizationId: org.id },
  });
  await prisma.recommendation.deleteMany({
    where: { organizationId: org.id },
  });

  // 6. Generate 90 days of realistic time-series data
  const now = new Date();
  const daysToGenerate = 90;

  // Baseline profiles per building: { waterBase (L/day), elecBase (kWh/day), wasteBase (kg/day) }
  const profiles: Record<
    string,
    { waterBase: number; elecBase: number; wasteBase: number; is24h: boolean }
  > = {
    "MAB-01": { waterBase: 18000, elecBase: 1250, wasteBase: 85, is24h: false },
    "ENG-02": { waterBase: 12000, elecBase: 1550, wasteBase: 65, is24h: false },
    "SCI-03": { waterBase: 24000, elecBase: 2400, wasteBase: 90, is24h: true },
    "LIB-04": { waterBase: 6500, elecBase: 850, wasteBase: 35, is24h: false },
    "HST-05": { waterBase: 58000, elecBase: 2200, wasteBase: 140, is24h: true },
    "CAF-06": { waterBase: 26000, elecBase: 1100, wasteBase: 210, is24h: false },
  };

  const resourceRecordsBatch = [];
  const wasteRecordsBatch = [];

  for (let dayOffset = daysToGenerate - 1; dayOffset >= 0; dayOffset--) {
    const recordDate = new Date(now);
    recordDate.setDate(recordDate.getDate() - dayOffset);
    recordDate.setHours(12, 0, 0, 0);

    const isWeekend = recordDate.getDay() === 0 || recordDate.getDay() === 6;

    for (const code of Object.keys(buildingsData.map((b) => b.code))) {
      const buildingCode = buildingsData[Number(code)].code;
      const buildingId = buildings[buildingCode];
      const prof = profiles[buildingCode];

      // Realistic variation factors
      // Weekday vs weekend activity multiplier
      let activityFactor = 1.0;
      if (isWeekend) {
        activityFactor = prof.is24h ? 0.95 : 0.35; // residential stays active, academics drop
      } else {
        activityFactor = 0.9 + Math.random() * 0.2; // 0.90 to 1.10
      }

      // Small day-to-day noise
      const noise = 0.95 + Math.random() * 0.1;

      let waterQuantity = Math.round(prof.waterBase * activityFactor * noise);
      let elecQuantity = Math.round(prof.elecBase * activityFactor * noise);

      // --- INJECT DELIBERATE SIMULATED ANOMALIES ---
      // Anomaly 1: Day -8 at Student Hostel (HST-05) -> Plumbing leakage surge
      if (dayOffset === 8 && buildingCode === "HST-05") {
        waterQuantity = Math.round(prof.waterBase * 1.94); // +94% spike
      }
      // Anomaly 2: Day -14 at Science Labs (SCI-03) -> Weekend HVAC Chiller Override
      if (dayOffset === 14 && buildingCode === "SCI-03" && isWeekend) {
        elecQuantity = Math.round(prof.elecBase * 1.88); // +88% surge
      }
      // Anomaly 3: Day -3 at Engineering Complex (ENG-02) -> Machine shop compressor left on
      if (dayOffset === 3 && buildingCode === "ENG-02") {
        elecQuantity = Math.round(prof.elecBase * 1.62); // +62% spike
      }

      // Water Record
      resourceRecordsBatch.push({
        organizationId: org.id,
        buildingId,
        resourceType: "WATER",
        quantity: waterQuantity,
        unit: "L",
        category: buildingCode === "CAF-06" ? "Kitchen & Dishwashing" : buildingCode === "HST-05" ? "Domestic" : "Restroom & Cooling",
        recordedAt: recordDate,
        dataSource: "DEMO_SIMULATION",
        notes: "DEMO DATA – SIMULATED, NOT LIVE SENSOR READINGS",
      });

      // Electricity Record
      resourceRecordsBatch.push({
        organizationId: org.id,
        buildingId,
        resourceType: "ELECTRICITY",
        quantity: elecQuantity,
        unit: "kWh",
        category: buildingCode === "SCI-03" ? "Lab Equipment & Fume Hoods" : buildingCode === "ENG-02" ? "Machinery & Computing" : "HVAC & Lighting",
        recordedAt: recordDate,
        dataSource: "DEMO_SIMULATION",
        notes: "DEMO DATA – SIMULATED, NOT LIVE SENSOR READINGS",
      });

      // Daily Waste Records (Categorized)
      const dailyWasteTotal = Math.round(prof.wasteBase * activityFactor * noise);
      
      // Breakdown based on building nature
      let organicRatio = 0.25;
      let paperRatio = 0.25;
      let plasticRatio = 0.20;
      let residualRatio = 0.30;

      if (buildingCode === "CAF-06") {
        organicRatio = 0.65;
        plasticRatio = 0.15;
        paperRatio = 0.10;
        residualRatio = 0.10;
      } else if (buildingCode === "LIB-04" || buildingCode === "MAB-01") {
        paperRatio = 0.45;
        plasticRatio = 0.20;
        organicRatio = 0.15;
        residualRatio = 0.20;
      }

      // 1. Organic
      wasteRecordsBatch.push({
        organizationId: org.id,
        buildingId,
        wasteCategory: "ORGANIC",
        quantityKg: Number((dailyWasteTotal * organicRatio).toFixed(1)),
        disposalMethod: "COMPOSTING",
        recyclable: true,
        recordedAt: recordDate,
        dataSource: "DEMO_SIMULATION",
        notes: "DEMO DATA – SIMULATED, NOT LIVE SENSOR READINGS",
      });

      // 2. Paper
      wasteRecordsBatch.push({
        organizationId: org.id,
        buildingId,
        wasteCategory: "PAPER",
        quantityKg: Number((dailyWasteTotal * paperRatio).toFixed(1)),
        disposalMethod: "RECYCLING",
        recyclable: true,
        recordedAt: recordDate,
        dataSource: "DEMO_SIMULATION",
        notes: "DEMO DATA – SIMULATED, NOT LIVE SENSOR READINGS",
      });

      // 3. Plastic
      wasteRecordsBatch.push({
        organizationId: org.id,
        buildingId,
        wasteCategory: "PLASTIC",
        quantityKg: Number((dailyWasteTotal * plasticRatio).toFixed(1)),
        disposalMethod: "RECYCLING",
        recyclable: true,
        recordedAt: recordDate,
        dataSource: "DEMO_SIMULATION",
        notes: "DEMO DATA – SIMULATED, NOT LIVE SENSOR READINGS",
      });

      // 4. Residual (Landfill)
      wasteRecordsBatch.push({
        organizationId: org.id,
        buildingId,
        wasteCategory: "RESIDUAL",
        quantityKg: Number((dailyWasteTotal * residualRatio).toFixed(1)),
        disposalMethod: "LANDFILL",
        recyclable: false,
        recordedAt: recordDate,
        dataSource: "DEMO_SIMULATION",
        notes: "DEMO DATA – SIMULATED, NOT LIVE SENSOR READINGS",
      });
    }
  }

  // Insert in batches
  await prisma.resourceRecord.createMany({ data: resourceRecordsBatch });
  await prisma.wasteRecord.createMany({ data: wasteRecordsBatch });

  console.log(
    `✅ Seeded ${resourceRecordsBatch.length} resource records and ${wasteRecordsBatch.length} waste records over 90 days.`
  );

  // 7. Seed Documented Anomalies
  const hostelDate = new Date(now);
  hostelDate.setDate(hostelDate.getDate() - 8);
  hostelDate.setHours(14, 30, 0, 0);

  const labDate = new Date(now);
  labDate.setDate(labDate.getDate() - 14);
  labDate.setHours(11, 0, 0, 0);

  const engDate = new Date(now);
  engDate.setDate(engDate.getDate() - 3);
  engDate.setHours(19, 45, 0, 0);

  await prisma.anomaly.create({
    data: {
      organizationId: org.id,
      buildingId: buildings["HST-05"],
      resourceType: "WATER",
      severity: "CRITICAL",
      observedValue: 112500,
      expectedValue: 58000,
      deviationPct: 94.0,
      explanation:
        "Severe water draw spike detected (+94.0% above 58,000 L baseline). Inspection reveals continuous residential block B supply line breach or stuck float valve.",
      status: "OPEN",
      detectedAt: hostelDate,
    },
  });

  await prisma.anomaly.create({
    data: {
      organizationId: org.id,
      buildingId: buildings["SCI-03"],
      resourceType: "ELECTRICITY",
      severity: "HIGH",
      observedValue: 4510,
      expectedValue: 2400,
      deviationPct: 87.9,
      explanation:
        "Elevated weekend electricity consumption (+87.9% above baseline). Centralized chiller units in South Research Wing were running at peak load during non-teaching hours.",
      status: "INVESTIGATING",
      detectedAt: labDate,
    },
  });

  await prisma.anomaly.create({
    data: {
      organizationId: org.id,
      buildingId: buildings["ENG-02"],
      resourceType: "ELECTRICITY",
      severity: "MEDIUM",
      observedValue: 2510,
      expectedValue: 1550,
      deviationPct: 61.9,
      explanation:
        "Unexpected after-hours electricity surge (+61.9% above baseline). Compressed air central line and CNC lab sub-station were left powered overnight.",
      status: "OPEN",
      detectedAt: engDate,
    },
  });

  console.log("✅ 3 Deliberate demonstration anomalies registered.");

  // 8. Seed Realistic Recommendations
  const recommendationsData = [
    {
      buildingId: buildings["HST-05"],
      title: "Remediate Continuous Leak & Install Acoustic Flow Sensors in Residential Block B",
      description:
        "Continuous 24-hour baseline consumption at Student Hostel showed an abnormal elevation of +94%, indicating a persistent leak or stuck reservoir ballcock valve.",
      category: "WATER",
      priority: "CRITICAL",
      evidence: "Observed 112,500 L on 8 days ago vs. typical 58,000 L baseline. Sustained night flow between 02:00 - 05:00 exceeded 1,800 L/hr.",
      recommendedAction:
        "Dispatch plumbing maintenance to inspect rooftop cistern ball valves and toilet flushes in Block B; install localized sub-metering.",
      estimatedBenefit: "Est. savings: ~54,000 Litres/day (~$135/day water tariff, ~18.9 kg CO2e/day avoided pumping emissions)",
      status: "IN_PROGRESS",
    },
    {
      buildingId: buildings["SCI-03"],
      title: "Implement Automated HVAC Chiller Setback Schedule for Science Laboratories",
      description:
        "Science Research Laboratories consumed 4,510 kWh over the weekend despite low recorded lab occupancy. Ventilation systems remained at 100% full-air turnover.",
      category: "ENERGY",
      priority: "HIGH",
      evidence: "Weekend draw was 88% above historical inactive schedule (4,510 kWh vs 2,400 kWh baseline).",
      recommendedAction:
        "Reconfigure Building Management System (BMS) with occupancy sensor setbacks; lower air exchange rates to 4 ACH during verified unoccupied hours.",
      estimatedBenefit: "Est. reduction: ~1,500 kWh/weekend (~$210/wk, ~630 kg CO2e/wk)",
      status: "ACCEPTED",
    },
    {
      buildingId: buildings["CAF-06"],
      title: "Establish On-Site Aerobic Composting for Dining Hall Organic Waste",
      description:
        "Cafeteria produces over 130 kg of pre- and post-consumer food scraps daily, representing 65% of its total waste stream.",
      category: "WASTE",
      priority: "HIGH",
      evidence: "Dining commons generates ~3,900 kg of organic waste per month currently mixed with residual collections.",
      recommendedAction:
        "Procure an on-site dual-drum in-vessel composter; train kitchen staff in separate food scrap binning.",
      estimatedBenefit: "Diverts ~45 tonnes/yr from landfill; avoids ~26 tonnes CO2e/yr of anaerobic methane generation.",
      status: "PROPOSED",
    },
    {
      buildingId: buildings["MAB-01"],
      title: "Deploy Smart Daylight Harvesting Controls in Academic Atrium",
      description:
        "Perimeter lighting remains illuminated at full power during daylight hours in the Main Academic Block multi-story atrium.",
      category: "ENERGY",
      priority: "MEDIUM",
      evidence: "Consistently draws 180 kWh/day during bright daylight windows (10:00 - 16:00).",
      recommendedAction: "Install photocell daylight sensors to automatically dim perimeter LED fixtures by 40-70% when natural lux exceeds 500.",
      estimatedBenefit: "Est. savings: 2,700 kWh/month (~$378/month, ~1,134 kg CO2e/month)",
      status: "PROPOSED",
    },
    {
      buildingId: buildings["ENG-02"],
      title: "Sub-meter Machine Shop Heavy Compressors with Auto-Shutoff",
      description:
        "Heavy air compressors in the Mechanical Engineering labs were identified running in unloaded state overnight.",
      category: "ENERGY",
      priority: "MEDIUM",
      evidence: "Nighttime baseline electricity draw spiked by 61.9% on Day -3.",
      recommendedAction: "Install an automated solenoid cut-off valve interlocked with the lab lighting circuit.",
      estimatedBenefit: "Est. savings: 350 kWh/week (~$49/week, ~147 kg CO2e/week)",
      status: "PROPOSED",
    },
  ];

  for (const r of recommendationsData) {
    await prisma.recommendation.create({
      data: {
        organizationId: org.id,
        buildingId: r.buildingId,
        title: r.title,
        description: r.description,
        category: r.category,
        priority: r.priority,
        evidence: r.evidence,
        recommendedAction: r.recommendedAction,
        estimatedBenefit: r.estimatedBenefit,
        status: r.status,
      },
    });
  }

  console.log("✅ 5 Evidence-based recommendations seeded.");

  // 9. Seed Simulated IoT Devices
  const devicesData = [
    {
      buildingId: buildings["MAB-01"],
      deviceName: "Main Academic Ultrasonic Flow Meter",
      deviceType: "WATER_METER",
      deviceStatus: "ONLINE",
      isSimulated: true,
      lastReadingValue: 18240,
    },
    {
      buildingId: buildings["MAB-01"],
      deviceName: "MAB Sub-Station Digital Smart Meter",
      deviceType: "ENERGY_METER",
      deviceStatus: "ONLINE",
      isSimulated: true,
      lastReadingValue: 1240,
    },
    {
      buildingId: buildings["SCI-03"],
      deviceName: "Science Research Central Chiller Energy Analyzer",
      deviceType: "ENERGY_METER",
      deviceStatus: "ONLINE",
      isSimulated: true,
      lastReadingValue: 2450,
    },
    {
      buildingId: buildings["HST-05"],
      deviceName: "Residential Village Water Main Digital Sensor",
      deviceType: "WATER_METER",
      deviceStatus: "ONLINE",
      isSimulated: true,
      lastReadingValue: 59100,
    },
    {
      buildingId: buildings["CAF-06"],
      deviceName: "Cafeteria Smart Bio-Waste Scale",
      deviceType: "SMART_BIN_SCALE",
      deviceStatus: "ONLINE",
      isSimulated: true,
      lastReadingValue: 142.5,
    },
  ];

  for (const d of devicesData) {
    await prisma.device.create({
      data: {
        organizationId: org.id,
        buildingId: d.buildingId,
        deviceName: d.deviceName,
        deviceType: d.deviceType,
        deviceStatus: d.deviceStatus,
        isSimulated: d.isSimulated,
        lastReadingValue: d.lastReadingValue,
        lastSeenAt: new Date(),
      },
    });
  }

  console.log("✅ 5 Simulated IoT devices registered with clear simulation tags.");

  // 10. Seed Notifications / Alerts
  await prisma.alertNotification.create({
    data: {
      organizationId: org.id,
      title: "Critical Water Surge in Student Hostel (HST-05)",
      message: "Water consumption exceeded normal threshold by +94%. Suspected plumbing defect in Block B.",
      severity: "CRITICAL",
      category: "WATER",
      relatedBuildingId: buildings["HST-05"],
      isRead: false,
      isResolved: false,
    },
  });

  await prisma.alertNotification.create({
    data: {
      organizationId: org.id,
      title: "Weekend After-Hours Energy Spike in Science Research Labs",
      message: "Chiller units and ventilation drew 4,510 kWh during unoccupied weekend schedule.",
      severity: "WARNING",
      category: "ENERGY",
      relatedBuildingId: buildings["SCI-03"],
      isRead: true,
      isResolved: false,
    },
  });

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
