import medsData from '@/assets/yenn.json';
import type { MedicationForm } from '@/src/types/firebase';

export type MedicationSuggestionSource = 'tr-local';

export interface MedicationSuggestion {
	name: string;
	dosage: string;
	source: MedicationSuggestionSource;
}

interface TrMedRow {
	'Güncel Barkod'?: string | number;
	'İlaç Adı'?: string;
	barcode?: string | number;
	Product_Name?: string;
}

function getTrRowName(row: TrMedRow): string {
	const fromLegacy = typeof row['İlaç Adı'] === 'string' ? row['İlaç Adı'].trim() : '';
	if (fromLegacy) return fromLegacy;

	const fromNew = typeof row.Product_Name === 'string' ? row.Product_Name.trim() : '';
	return fromNew;
}

function getTrRowBarcode(row: TrMedRow): string {
	const legacy = row['Güncel Barkod'];
	if (legacy !== undefined && legacy !== null) {
		const value = String(legacy).trim();
		if (value) return value;
	}

	const next = row.barcode;
	if (next !== undefined && next !== null) {
		const value = String(next).trim();
		if (value) return value;
	}

	return '';
}

const TR_MED_NAMES = Array.from(
	new Set(
		(medsData as TrMedRow[])
			.map((row) => getTrRowName(row))
			.filter(Boolean),
	),
);

const TR_MED_ROWS = (medsData as TrMedRow[]).filter(
	(row) => Boolean(getTrRowName(row)),
);

const TR_MED_BY_BARCODE = new Map(
	TR_MED_ROWS
		.map((row) => [getTrRowBarcode(row), row] as const)
		.filter(([barcode]) => Boolean(barcode)),
);

const DOSAGE_REGEX =
	/(%\s*\d+[.,]?\d*|\d+[.,]?\d*\s*(mg|mcg|g|ml|iu|units|unit|tablet|capsule|drop|puff|spray)(\s*\/\s*\d+[.,]?\d*\s*(ml|g))?)/gi;

const PACKAGING_TOKENS_REGEX =
	/\b(BFS|SETLI|SETSIZ|SETSIZ|SETLI|TORBA|SISE|SİSE|POLIPROPILEN|POLIFARMA|BIOSEL|IRR\.?|SOL\.?|COZ\.?|COZELTI|COZELTISI|ICEREN|IÇEREN|ORAL|IV|IM|SC)\b/gi;

function normalizeQuery(value: string): string {
	return value
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.trim();
}

function dedupeNames(values: string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const value of values) {
		const key = value.trim().toLowerCase();
		if (!key || seen.has(key)) continue;
		seen.add(key);
		result.push(value.trim());
	}

	return result;
}

function dedupeSuggestions(values: MedicationSuggestion[]): MedicationSuggestion[] {
	const seen = new Set<string>();
	const result: MedicationSuggestion[] = [];

	for (const item of values) {
		const key = `${item.name.toLowerCase()}|${item.dosage.toLowerCase()}`;
		if (!item.name.trim() || seen.has(key)) continue;
		seen.add(key);
		result.push(item);
	}

	return result;
}

function extractDosage(raw: string): string {
	const matches = raw.match(DOSAGE_REGEX) ?? [];
	const normalized = matches
		.map((m) => m.replace(/\s+/g, ' ').trim().toUpperCase())
		.filter(Boolean);

	if (normalized.length === 0) return '';

	return Array.from(new Set(normalized)).join(' • ');
}

function parseDosageAndUnit(raw: string): { dosage: string; unit: string } {
	const normalized = raw.replace(/,/g, '.').toLowerCase();
	const match = normalized.match(/(\d+(?:\.\d+)?)\s*(mg\/ml|mcg\/ml|mg|mcg|g|ml|iu|units|unit)/i);

	if (!match) {
		const percentMatch = normalized.match(/%\s*(\d+(?:\.\d+)?)/);
		if (percentMatch) {
			return { dosage: percentMatch[1], unit: '%' };
		}
		return { dosage: '', unit: '' };
	}

	const rawUnit = match[2].toLowerCase();
	const unitMap: Record<string, string> = {
		'mg/ml': 'mg/mL',
		'mcg/ml': 'mcg/mL',
		mg: 'mg',
		mcg: 'mcg',
		g: 'g',
		ml: 'mL',
		iu: 'IU',
		unit: 'units',
		units: 'units',
	};

	return {
		dosage: match[1],
		unit: unitMap[rawUnit] ?? rawUnit,
	};
}

function guessMedicationForm(raw: string): MedicationForm {
	const upper = raw.toUpperCase();

	if (upper.includes('TABLET')) return 'tablet';
	if (upper.includes('KAPSUL') || upper.includes('CAPSUL')) return 'capsule';
	if (upper.includes('ENJEKSIYON') || upper.includes('FLAKON') || upper.includes('AMPU')) {
		return 'injection';
	}
	if (upper.includes('INHALER')) return 'inhaler';
	if (upper.includes('PATCH') || upper.includes('FLASTER')) return 'patch';
	if (upper.includes('KREM') || upper.includes('JEL') || upper.includes('POMAD')) return 'cream';
	if (upper.includes('DAMLA')) return 'drops';
	if (upper.includes('SUPPO') || upper.includes('FITIL')) return 'suppository';
	if (upper.includes('SPREY') || upper.includes('SPRAY')) return 'spray';
	if (upper.includes('TOZ') || upper.includes('POWDER')) return 'powder';
	if (upper.includes('PASTIL') || upper.includes('LOZENGE')) return 'lozenge';
	if (upper.includes('COZELTI') || upper.includes('SOLUSYON') || upper.includes('SURUP')) {
		return 'liquid';
	}

	return 'tablet';
}

function extractMedicationName(raw: string): string {
	let value = raw;

	value = value.replace(/\([^)]*\)/g, ' ');
	value = value.replace(DOSAGE_REGEX, ' ');
	value = value.replace(PACKAGING_TOKENS_REGEX, ' ');
	value = value.replace(/\s+/g, ' ').trim();

	return value || raw.trim();
}

function toSuggestion(raw: string, source: MedicationSuggestionSource): MedicationSuggestion {
	return {
		name: extractMedicationName(raw),
		dosage: extractDosage(raw),
		source,
	};
}

export function searchTrMedicationSuggestions(query: string, limit = 8): MedicationSuggestion[] {
	const normalizedQuery = normalizeQuery(query);
	if (normalizedQuery.length < 2) return [];

	const startsWithMatches: MedicationSuggestion[] = [];
	const containsMatches: MedicationSuggestion[] = [];

	for (const rawName of TR_MED_NAMES) {
		const suggestion = toSuggestion(rawName, 'tr-local');
		const normalizedName = normalizeQuery(suggestion.name);
		if (!normalizedName.includes(normalizedQuery)) continue;

		if (normalizedName.startsWith(normalizedQuery)) {
			startsWithMatches.push(suggestion);
		} else {
			containsMatches.push(suggestion);
		}

		if (startsWithMatches.length + containsMatches.length >= limit * 3) {
			break;
		}
	}

	return dedupeSuggestions([...startsWithMatches, ...containsMatches]).slice(0, limit);
}

export interface TrBarcodeMedicationMatch {
	barcode: string;
	name: string;
	dosage: string;
	dosageValue: string;
	unit: string;
	form: MedicationForm;
}

export type BarcodeMedicationSource = 'tr-local' | 'openfda-us' | 'openfoodfacts-us';

export interface BarcodeMedicationMatch extends TrBarcodeMedicationMatch {
	source: BarcodeMedicationSource;
}

export function findTrMedicationByBarcode(rawBarcode: string): TrBarcodeMedicationMatch | null {
	const barcode = String(rawBarcode ?? '').replace(/\D/g, '');
	if (!barcode) return null;

	const row = TR_MED_BY_BARCODE.get(barcode);
	if (!row) return null;

	const rawName = getTrRowName(row);
	if (!rawName) return null;
	const parsed = parseDosageAndUnit(rawName);

	return {
		barcode,
		name: extractMedicationName(rawName),
		dosage: extractDosage(rawName),
		dosageValue: parsed.dosage,
		unit: parsed.unit,
		form: guessMedicationForm(rawName),
	};
}

interface OpenFdaNdcResult {
	brand_name?: string;
	generic_name?: string;
	dosage_form?: string;
	route?: string[];
	active_ingredients?: Array<{ name?: string; strength?: string }>;
	package_ndc?: string;
	product_ndc?: string;
}

interface OpenFdaResponse {
	results?: OpenFdaNdcResult[];
}

interface OpenFoodFactsResponse {
	status?: number;
	product?: {
		product_name?: string;
		generic_name?: string;
		brands?: string;
		quantity?: string;
	};
}

const BARCODE_DEBUG = __DEV__;

function logBarcodeDebug(...args: unknown[]) {
	if (!BARCODE_DEBUG) return;
	console.log('[BarcodeLookup]', ...args);
}

function dedupeStrings(values: string[]): string[] {
	return Array.from(new Set(values.filter(Boolean)));
}

function expandBarcodeCandidates(barcode: string): string[] {
	const digits = String(barcode ?? '').replace(/\D/g, '');
	if (!digits) return [];

	const candidates: string[] = [digits];

	// UPC-A represented as EAN-13 often comes with a leading zero.
	if (digits.length === 13 && digits.startsWith('0')) {
		candidates.push(digits.slice(1));
	}

	// Some scanners may drop a leading zero and return 11 digits.
	if (digits.length === 11) {
		candidates.push(`0${digits}`);
	}

	return dedupeStrings(candidates);
}

function buildNdcCandidatesFromUpc(barcode: string): string[] {
	if (barcode.length !== 12) return [];

	// Typical drug UPC-A mapping: strip leading system digit and trailing checksum.
	const core = barcode.slice(1, 11);
	if (core.length !== 10) return [];

	const seg442 = `${core.slice(0, 4)}-${core.slice(4, 8)}-${core.slice(8, 10)}`;
	const seg532 = `${core.slice(0, 5)}-${core.slice(5, 8)}-${core.slice(8, 10)}`;
	const seg541 = `${core.slice(0, 5)}-${core.slice(5, 9)}-${core.slice(9, 10)}`;

	// 11-digit normalized forms (5-4-2) by padding the short segment.
	const norm442 = `0${core.slice(0, 4)}-${core.slice(4, 8)}-${core.slice(8, 10)}`;
	const norm532 = `${core.slice(0, 5)}-0${core.slice(5, 8)}-${core.slice(8, 10)}`;
	const norm541 = `${core.slice(0, 5)}-${core.slice(5, 9)}-0${core.slice(9, 10)}`;

	return dedupeStrings([seg442, seg532, seg541, norm442, norm532, norm541]);
}

function buildOpenFdaSearchCandidates(barcode: string): string[] {
	const ndcCandidates = buildNdcCandidatesFromUpc(barcode);
	const exactBarcode = `"${barcode}"`;

	const queries: string[] = [
		`package_ndc:${exactBarcode}`,
		`product_ndc:${exactBarcode}`,
		`package_ndc:*${barcode}*`,
		`product_ndc:*${barcode}*`,
	];

	for (const ndc of ndcCandidates) {
		const quoted = `"${ndc}"`;
		queries.push(`product_ndc:${quoted}`);
		queries.push(`package_ndc:${quoted}`);

		const parts = ndc.split('-');
		if (parts.length >= 2 && parts[0] && parts[1]) {
			queries.push(`product_ndc:*${parts[0]}-${parts[1]}*`);
		}
	}

	return dedupeStrings(queries);
}

function mapOpenFdaForm(result: OpenFdaNdcResult): MedicationForm {
	const routeJoined = (result.route ?? []).join(' ').toUpperCase();
	const dosageForm = (result.dosage_form ?? '').toUpperCase();
	const combined = `${dosageForm} ${routeJoined}`.trim();

	if (combined.includes('TABLET')) return 'tablet';
	if (combined.includes('CAPSULE')) return 'capsule';
	if (combined.includes('INJECTION') || combined.includes('INTRAVENOUS') || combined.includes('INTRAMUSCULAR')) return 'injection';
	if (combined.includes('SOLUTION') || combined.includes('SUSPENSION') || combined.includes('SYRUP')) return 'liquid';
	if (combined.includes('SPRAY') || combined.includes('AEROSOL')) return 'spray';
	if (combined.includes('CREAM') || combined.includes('OINTMENT') || combined.includes('GEL')) return 'cream';
	if (combined.includes('PATCH')) return 'patch';
	if (combined.includes('POWDER')) return 'powder';
	if (combined.includes('SUPPOSITORY')) return 'suppository';
	if (combined.includes('LOZENGE')) return 'lozenge';

	return 'tablet';
}

function parseStrengthLine(rawStrength: string): { dosageValue: string; unit: string; dosage: string } | null {
	const normalized = rawStrength.replace(/,/g, '.').trim();
	if (!normalized) return null;

	const ratioMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu|units?)\s*\/\s*(\d+(?:\.\d+)?)\s*(ml|g|l)/i);
	if (ratioMatch) {
		const value = ratioMatch[1];
		const unitRaw = ratioMatch[2].toLowerCase();
		const unit = unitRaw === 'ml' ? 'mL' : unitRaw === 'iu' ? 'IU' : unitRaw === 'unit' ? 'units' : unitRaw;
		const denVal = ratioMatch[3];
		const denUnit = ratioMatch[4].toLowerCase() === 'ml' ? 'mL' : ratioMatch[4];
		return {
			dosageValue: value,
			unit,
			dosage: `${value} ${unit}/${denVal} ${denUnit}`,
		};
	}

	const simpleMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu|units?|%)/i);
	if (!simpleMatch) return null;

	const value = simpleMatch[1];
	const unitRaw = simpleMatch[2].toLowerCase();
	const unitMap: Record<string, string> = {
		mg: 'mg',
		mcg: 'mcg',
		g: 'g',
		ml: 'mL',
		iu: 'IU',
		unit: 'units',
		units: 'units',
		'%': '%',
	};

	return {
		dosageValue: value,
		unit: unitMap[unitRaw] ?? simpleMatch[2],
		dosage: `${value} ${unitMap[unitRaw] ?? simpleMatch[2]}`,
	};
}

function parseOpenFdaStrength(result: OpenFdaNdcResult): { dosageValue: string; unit: string; dosage: string } {
	const strengths = (result.active_ingredients ?? [])
		.map((x) => x.strength?.trim() ?? '')
		.filter(Boolean);

	for (const strength of strengths) {
		const parsed = parseStrengthLine(strength);
		if (parsed) return parsed;
	}

	const fromName = parseStrengthLine(result.brand_name ?? '') ?? parseStrengthLine(result.generic_name ?? '');
	if (fromName) return fromName;

	return { dosageValue: '', unit: '', dosage: strengths[0] ?? '' };
}

async function fetchOpenFdaByBarcode(barcode: string): Promise<OpenFdaNdcResult | null> {
	const barcodeCandidates = expandBarcodeCandidates(barcode);
	const searchCandidates = dedupeStrings(
		barcodeCandidates.flatMap((candidate) => buildOpenFdaSearchCandidates(candidate)),
	);

	logBarcodeDebug('OpenFDA barcode lookup start', { barcode, barcodeCandidates, queryCount: searchCandidates.length });

	for (const search of searchCandidates) {
		try {
			const url = `https://api.fda.gov/drug/ndc.json?search=${encodeURIComponent(search)}&limit=1`;
			const response = await fetch(url);
			if (!response.ok) {
				logBarcodeDebug('OpenFDA barcode miss', { search, status: response.status });
				continue;
			}

			const data = (await response.json()) as OpenFdaResponse;
			const first = data.results?.[0];
			if (first) {
				logBarcodeDebug('OpenFDA barcode hit', {
					search,
					brand: first.brand_name,
					productNdc: first.product_ndc,
					packageNdc: first.package_ndc,
				});
				return first;
			}

			logBarcodeDebug('OpenFDA barcode empty', { search });
		} catch {
			// Ignore per-candidate failures and keep trying.
			logBarcodeDebug('OpenFDA barcode error', { search });
		}
	}

	logBarcodeDebug('OpenFDA barcode lookup end: no hit', { barcode });

	return null;
}

function tokenizeBrandCandidates(raw: string): string[] {
	const cleaned = raw
		.replace(/[^a-zA-Z0-9\s-]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	if (!cleaned) return [];

	const tokens = cleaned.split(' ').filter(Boolean);
	const filtered = tokens.filter((t) => !/^\d+([.,]\d+)?$/.test(t) && !/^(mg|mcg|g|ml|iu|units?)$/i.test(t));
	const first = filtered[0] ?? tokens[0] ?? '';
	const firstTwo = filtered.slice(0, 2).join(' ');
	const firstThree = filtered.slice(0, 3).join(' ');
	const singles = filtered.filter((t) => t.length >= 4);

	return dedupeStrings([cleaned, firstThree, firstTwo, first, ...singles]).filter((v) => v.length >= 3);
}

async function fetchOpenFoodFactsProductName(barcode: string): Promise<string | null> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 3000);

	try {
		const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) return null;

		const data = (await response.json()) as OpenFoodFactsResponse;
		if (data.status !== 1) return null;

		const name = data.product?.product_name?.trim() ?? '';
		const genericName = data.product?.generic_name?.trim() ?? '';
		const brands = data.product?.brands?.split(',')[0]?.trim() ?? '';
		const resolved = name || genericName || brands || null;
		logBarcodeDebug('OpenFoodFacts product name', { barcode, resolved });
		return resolved;
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

async function fetchOpenFoodFactsProduct(barcode: string): Promise<OpenFoodFactsResponse['product'] | null> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 3000);

	try {
		const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) return null;

		const data = (await response.json()) as OpenFoodFactsResponse;
		if (data.status !== 1) return null;
		return data.product ?? null;
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

async function fetchOpenFdaByBrandName(name: string): Promise<OpenFdaNdcResult | null> {
	const candidates = tokenizeBrandCandidates(name);
	const fields = ['brand_name', 'generic_name', 'substance_name'];

	logBarcodeDebug('OpenFDA name lookup start', { name, candidates });

	for (const candidate of candidates) {
		const localQueries: string[] = [];
		for (const field of fields) {
			localQueries.push(`${field}:\"${candidate}\"`);
			if (!candidate.includes(' ')) {
				localQueries.push(`${field}:*${candidate}*`);
			}
		}

		for (const search of localQueries) {
			try {
				const url = `https://api.fda.gov/drug/ndc.json?search=${encodeURIComponent(search)}&limit=1`;
				const response = await fetch(url);
				if (!response.ok) {
					logBarcodeDebug('OpenFDA name miss', { search, status: response.status });
					continue;
				}

				const data = (await response.json()) as OpenFdaResponse;
				const first = data.results?.[0];
				if (first) {
					logBarcodeDebug('OpenFDA name hit', {
						search,
						brand: first.brand_name,
						productNdc: first.product_ndc,
					});
					return first;
				}

				logBarcodeDebug('OpenFDA name empty', { search });
			} catch {
				// Try next pattern
				logBarcodeDebug('OpenFDA name error', { search });
			}
		}
	}

	logBarcodeDebug('OpenFDA name lookup end: no hit', { name });

	return null;
}

function parseOpenFoodFactsDosage(product: OpenFoodFactsResponse['product']): { dosageValue: string; unit: string; dosage: string } {
	const raw = `${product?.product_name ?? ''} ${product?.generic_name ?? ''} ${product?.quantity ?? ''}`.trim();
	if (!raw) return { dosageValue: '', unit: '', dosage: '' };

	const normalized = raw.replace(/,/g, '.');
	const ratioMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu|units?)\s*\/\s*(\d+(?:\.\d+)?)\s*(ml|g|l)/i);
	if (ratioMatch) {
		const value = ratioMatch[1];
		const unitRaw = ratioMatch[2].toLowerCase();
		const unit = unitRaw === 'ml' ? 'mL' : unitRaw === 'iu' ? 'IU' : unitRaw === 'unit' ? 'units' : unitRaw;
		const denVal = ratioMatch[3];
		const denUnit = ratioMatch[4].toLowerCase() === 'ml' ? 'mL' : ratioMatch[4];
		return {
			dosageValue: value,
			unit,
			dosage: `${value} ${unit}/${denVal} ${denUnit}`,
		};
	}

	const match = normalized.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu|units?)/i);
	if (!match) return { dosageValue: '', unit: '', dosage: '' };

	const unitRaw = match[2].toLowerCase();
	const unitMap: Record<string, string> = {
		mg: 'mg',
		mcg: 'mcg',
		g: 'g',
		ml: 'mL',
		iu: 'IU',
		unit: 'units',
		units: 'units',
	};

	return {
		dosageValue: match[1],
		unit: unitMap[unitRaw] ?? match[2],
		dosage: `${match[1]} ${unitMap[unitRaw] ?? match[2]}`,
	};
}

async function buildOpenFoodFactsFallbackMatch(barcode: string): Promise<BarcodeMedicationMatch | null> {
	const product = await fetchOpenFoodFactsProduct(barcode);
	if (!product) return null;

	const name = (product.product_name ?? product.generic_name ?? product.brands ?? '').trim();
	if (!name) return null;

	const parsed = parseOpenFoodFactsDosage(product);

	const fallback = {
		barcode,
		name,
		dosage: parsed.dosage,
		dosageValue: parsed.dosageValue,
		unit: parsed.unit,
		form: guessMedicationForm(name),
		source: 'openfoodfacts-us',
	};

	logBarcodeDebug('OpenFoodFacts fallback match', fallback);

	return fallback;
}

export async function findUsMedicationByBarcode(rawBarcode: string): Promise<BarcodeMedicationMatch | null> {
	const barcode = String(rawBarcode ?? '').replace(/\D/g, '');
	if (!barcode) return null;

	logBarcodeDebug('US lookup request', { rawBarcode, barcode });

	let row = await fetchOpenFdaByBarcode(barcode);

	if (!row) {
		const productName = await fetchOpenFoodFactsProductName(barcode);
		if (productName) {
			row = await fetchOpenFdaByBrandName(productName);
		}
	}

	if (!row) {
		const fallback = await buildOpenFoodFactsFallbackMatch(barcode);
		if (!fallback) {
			logBarcodeDebug('US lookup final miss', { barcode });
		}
		return fallback;
	}

	const parsed = parseOpenFdaStrength(row);
	const name = row.brand_name?.trim() || row.generic_name?.trim() || '';
	if (!name) return null;

	return {
		barcode,
		name,
		dosage: parsed.dosage,
		dosageValue: parsed.dosageValue,
		unit: parsed.unit,
		form: mapOpenFdaForm(row),
		source: 'openfda-us',
	};
}

export async function findMedicationByBarcode(rawBarcode: string): Promise<BarcodeMedicationMatch | null> {
	const trMatch = findTrMedicationByBarcode(rawBarcode);
	if (trMatch) {
		return { ...trMatch, source: 'tr-local' };
	}

	return findUsMedicationByBarcode(rawBarcode);
}
