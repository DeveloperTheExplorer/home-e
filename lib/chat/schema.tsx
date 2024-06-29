import { z } from "zod";

const addressSchema = z.object({
  line1: z.string().optional().describe("Restricts programs that apply at a specific street address."),
  line2: z.string().optional().describe("Restricts programs that apply at a specific street address."),
  city: z.string().optional().describe("Restricts programs that apply at a specific city."),
  state: z.string().optional().describe("Restricts programs to a specific U.S. state. Expressed as either a 2 digit abbreviation or as the full state name."),
  zipcode: z.string().length(5).describe("A 5 character U.S. postal code.")
}).describe("Contains address parameters.");

const propertyTypeEnum = z.enum(["single_family", "multifamily", "commercial"]);

const taxFilingStatusEnum = z.enum(["individual", "head_of_household", "joint"]);

const upgradeMeasureSchema = z.object({
  measure: z.string().describe("An enum representing the upgrade measure."),
  estimated_min_cost: z.number().int().optional().describe("Your estimated minimum cost of the upgrade measure expressed as an integer in cents."),
  estimated_max_cost: z.number().int().optional().describe("Your estimated maximum cost of the upgrade measure expressed as an integer in cents.")
});

export const requestELISchema = z.object({
  address: addressSchema.required(),
  property_type: propertyTypeEnum.describe("The zoning type of the intended applicant."),
  household_income: z.number().int().optional().describe("The total household income requested as an integer in cents. E.g. $30,500 would be represented as 3050000."),
  household_size: z.number().int().optional().describe("The number of occupants that live in the household."),
  tax_filing_status: taxFilingStatusEnum.optional().describe("The tax filing status of the primary applicant."),
  utility_customer_requirements: z.array(z.string()).optional().describe("Filter that restricts incentives by one or more specified utilities that the customer subscribes to."),
  upgrade_measures: z.array(upgradeMeasureSchema).optional().describe("Filter that restricts programs returned by one or more specified upgrade measures objects."),
  metadata: z.record(z.unknown()).optional().describe("An object for including additional key-value pairs, such as system IDs, to be returned in the API response.")
});