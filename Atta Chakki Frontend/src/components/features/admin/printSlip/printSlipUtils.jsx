/**
 * Print Slip Utilities - Modular Barrel Export
 *
 * Decomposed into focused single-responsibility modules:
 * - LogoSVG: Shared SVG Logo
 * - slipFinancials: Financial computations & balance breakdowns
 * - slipUrduHelpers: Urdu corrections, units, & customization translations
 * - thermalPrintHtmlBuilder: 80mm thermal receipt HTML generator
 * - slipWhatsAppBuilder: WhatsApp digital invoice generator
 */

export { LogoSVG } from './LogoSVG';
export { computeSlipFinancials, default as defaultComputeSlipFinancials } from './utils/slipFinancials';
export {
  applySlipUrduCorrections,
  translateSlipUnit,
  translateSlipCustomizations
} from './utils/slipUrduHelpers';
export { buildThermalPrintHtml, default as defaultBuildThermalPrintHtml } from './utils/thermalPrintHtmlBuilder';
export { buildSlipWhatsAppMessage, default as defaultBuildSlipWhatsAppMessage } from './utils/slipWhatsAppBuilder';
