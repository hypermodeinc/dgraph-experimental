import { CsvToRdf } from "../src/csvToRdf";

jest.mock("papaparse", () => {
  const originalPapa = jest.requireActual("papaparse");

  return {
    ...originalPapa,
    parse: (input: any, config: any) => {
      if (input && typeof input.stream === "function") {
        const content = input.content || "";
        return originalPapa.parse(content, config);
      }
      return originalPapa.parse(input, config);
    },
  };
});

const mockTemplate = `
<_:School_[School.ID]> <dgraph.type> "School" .
<_:School_[School.ID]> <School.name> "[School.Name]" .
<_:Project_[Project.ID]> <dgraph.type> "Project" .
<_:Project_[Project.ID]> <Project.title> "[Project.Title]" .
<_:Project_[Project.ID]> <Project.school> <_:School_[School.ID]> .
`;

const quotedHeaderTemplate = `
<_:Project_[Project.ID]> <dgraph.type> "Project" .
<_:Project_[Project.ID]> <Project.id> "[Project.ID]" .
<_:Donation_[Donation.ID]> <dgraph.type> "Donation" .
<_:Donation_[Donation.ID]> <Donation.id> "[Donation.ID]" .
<_:Donation_[Donation.ID]> <Donation.amount> "[Donation.Amount]" .
<_:Donor_[Donor.ID]> <dgraph.type> "Donor" .
<_:Donor_[Donor.ID]> <Donor.id> "[Donor.ID]" .
<_:Donation_[Donation.ID]> <Donation.project> <_:Project_[Project.ID]> .
<_:Donation_[Donation.ID]> <Donation.donor> <_:Donor_[Donor.ID]> .
`;

function createMockCsvString(data: string[][]): string {
  return data.map((row) => row.join(",")).join("\n");
}

class MockFile {
  content: string;
  name: string;
  type: string;

  constructor(content: string, filename: string, options: any = {}) {
    this.content = content;
    this.name = filename;
    this.type = options.type || "text/csv";
  }

  // Minimal implementation to be recognized as File object
  stream() {
    return {};
  }
}

describe("CsvToRdf", () => {
  const mockCsvData = [
    ["School.ID", "School.Name", "Project.ID", "Project.Title"],
    ["SCHOOL-001", "Lincoln High School", "PROJ-001", "Math Competition Gear"],
    [
      "SCHOOL-002",
      "Roosevelt Elementary",
      "PROJ-002",
      "Science Fair Materials",
    ],
  ];

  const quotedHeaderCsvData = [
    ['"Project.ID"', '"Donation.ID"', '"Donor.ID"', '"Donation.Amount"'],
    ['"PROJ001"', '"DON001"', '"DONOR001"', '"100.50"'],
    ['"PROJ002"', '"DON002"', '"DONOR002"', '"25.00"'],
  ];

  test("basic snapshot test", async () => {
    const csvString = createMockCsvString(mockCsvData);
    const converter = new CsvToRdf({ template: mockTemplate });

    const result = await converter.processCSVString(csvString);
    expect(result).toMatchSnapshot();
  });

  test("processes with progress tracking", async () => {
    const csvString = createMockCsvString(mockCsvData);
    const progressValues: number[] = [];

    const converter = new CsvToRdf({
      template: mockTemplate,
      onProgress: (progress) => {
        progressValues.push(progress);
      },
    });

    const result = await converter.processCSVString(csvString);

    expect(result).toBeTruthy();
    expect(progressValues.length).toBeGreaterThan(0);
    expect(progressValues[progressValues.length - 1]).toBe(100);
  });

  test("processes CSV file correctly", async () => {
    const csvString = createMockCsvString(mockCsvData);
    const file = new MockFile(csvString, "test.csv", { type: "text/csv" });

    const converter = new CsvToRdf({ template: mockTemplate });
    const result = await converter.processCSVFile(file as any);

    expect(result).toMatchSnapshot();
  });

  test("handles empty CSV correctly", async () => {
    const emptyData = [["Column1", "Column2"]];
    const csvString = createMockCsvString(emptyData);

    const converter = new CsvToRdf({ template: mockTemplate });
    const result = await converter.processCSVString(csvString);

    expect(result).toBe("");
  });

  test("handles large CSV with chunking", async () => {
    const largeData = [
      ["School.ID", "School.Name", "Project.ID", "Project.Title"],
    ];
    for (let i = 1; i <= 100; i++) {
      largeData.push([
        `SCHOOL-${i}`,
        `School ${i}`,
        `PROJ-${i}`,
        `Project ${i}`,
      ]);
    }

    const csvString = createMockCsvString(largeData);
    const converter = new CsvToRdf({
      template: mockTemplate,
      chunkSize: 10,
    });

    const result = await converter.processCSVString(csvString);

    const lines = result.split("\n").filter((line) => line.trim());
    expect(lines.length).toBeGreaterThan(400);
  });

  // New tests for quoted headers
  test("handles quoted headers correctly", async () => {
    const csvString = createMockCsvString(quotedHeaderCsvData);
    const converter = new CsvToRdf({
      template: quotedHeaderTemplate,
      normalizeHeaders: true,
    });

    const result = await converter.processCSVString(csvString);

    // Should contain processed data without quoted header issues
    expect(result).toContain("Project.id");
    expect(result).toContain("Donation.id");
    expect(result).toContain("Donor.id");
    expect(result).toContain('"PROJ001"');
    expect(result).toContain('"DON001"');
    expect(result).toContain('"DONOR001"');
  });

  test("header mapping works correctly", async () => {
    const csvString = createMockCsvString(quotedHeaderCsvData);
    const converter = new CsvToRdf({
      template: quotedHeaderTemplate,
      normalizeHeaders: true,
    });

    await converter.processCSVString(csvString);

    const headerMapping = converter.getHeaderMapping();
    const normalizedHeaders = converter.getNormalizedHeaders();

    expect(headerMapping.size).toBeGreaterThan(0);
    expect(normalizedHeaders).toContain("Project.ID");
    expect(normalizedHeaders).toContain("Donation.ID");
    expect(normalizedHeaders).toContain("Donor.ID");
    expect(normalizedHeaders).toContain("Donation.Amount");
  });

  test("can disable header normalization", async () => {
    const csvString = createMockCsvString(quotedHeaderCsvData);
    const converter = new CsvToRdf({
      template: quotedHeaderTemplate,
      normalizeHeaders: false,
    });

    await converter.processCSVString(csvString);

    const headerMapping = converter.getHeaderMapping();

    // With normalization disabled, mapping should be minimal
    expect(headerMapping.size).toBeLessThanOrEqual(
      quotedHeaderCsvData[0].length * 2,
    );
  });

  test("handles mixed quote styles", async () => {
    const mixedQuoteData = [
      ['"Project.ID"', "'Donation.ID'", "Donor.ID", '"Donation.Amount"'],
      ['"PROJ001"', "'DON001'", "DONOR001", '"100.50"'],
      ['"PROJ002"', "'DON002'", "DONOR002", '"25.00"'],
    ];

    const csvString = createMockCsvString(mixedQuoteData);
    const converter = new CsvToRdf({
      template: quotedHeaderTemplate,
      normalizeHeaders: true,
    });

    const result = await converter.processCSVString(csvString);

    expect(result).toContain("Project.id");
    expect(result).toContain("Donation.id");
    expect(result).toContain("Donor.id");
  });

  test("handles escaped quotes in headers", async () => {
    const escapedQuoteData = [
      ['"Project ""Special"" ID"', '"Donation.ID"', '"Donor.ID"'],
      ['"PROJ001"', '"DON001"', '"DONOR001"'],
    ];

    const templateWithEscaped = `
<_:Project_[Project "Special" ID]> <dgraph.type> "Project" .
<_:Donation_[Donation.ID]> <dgraph.type> "Donation" .
<_:Donor_[Donor.ID]> <dgraph.type> "Donor" .
`;

    const csvString = createMockCsvString(escapedQuoteData);
    const converter = new CsvToRdf({
      template: templateWithEscaped,
      normalizeHeaders: true,
    });

    const result = await converter.processCSVString(csvString);

    // Should handle escaped quotes correctly
    expect(result).toBeTruthy();

    const normalizedHeaders = converter.getNormalizedHeaders();
    expect(normalizedHeaders).toContain('Project "Special" ID');
  });

  test("progress tracking works with quoted headers", async () => {
    const csvString = createMockCsvString(quotedHeaderCsvData);
    const progressValues: number[] = [];

    const converter = new CsvToRdf({
      template: quotedHeaderTemplate,
      normalizeHeaders: true,
      onProgress: (progress) => {
        progressValues.push(progress);
      },
    });

    const result = await converter.processCSVString(csvString);

    expect(result).toBeTruthy();
    expect(progressValues.length).toBeGreaterThan(0);
    expect(progressValues[progressValues.length - 1]).toBe(100);
  });
});
