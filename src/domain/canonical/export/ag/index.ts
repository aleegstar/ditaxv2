export * from './types';
export { mapDossierToAG } from './mapper';
export { buildAGExportPayload, type BuildAGExportContext } from './payloadBuilder';
export { flattenPayload, diffPayloads, stringifyPayload, type PayloadDiff, type PayloadFieldRow } from './inspector';
export { recordAGExport, listAGExports, type RecordedExport } from './persistence';
export { allFixtures, fixtureSingleEmployee, fixtureFamilyWithChildren, fixtureInvestor } from './fixtures';

// XML / ZIP serializer pipeline
export { serializeAGPayloadToXml, payloadToRiag, riagToXmlElement } from './xml/serializer';
export { buildDeterministicZip, type ZipEntry } from './xml/zipBuilder';
export { validateAGPayload, type ExportValidationFinding, type ExportValidationResult } from './xml/validator';
export { buildAGExportPackage, ExportValidationError, type PackageResult } from './packageBuilder';
export type { RiagDocument } from './xml/riag/structure';
